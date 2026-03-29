from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

_log = logging.getLogger(__name__)

from wattsup.config import Settings
from wattsup.db import (
    ensure_energy_logs_timeseries,
    enrich_and_insert,
    fetch_recent_scores,
    get_alert_state_collection,
    get_collection,
    ideal_price_should_notify,
    merge_alert_state_update,
    zscore_cooldown_allows_notify,
)
from wattsup.models import EnergyLogDocument, FuelMix, PollContext
from wattsup.quant import eco_efficiency_score, z_score
from wattsup.tools import (
    ComEd5MinTool,
    GridStatusFuelMixTool,
    HexRunTool,
    K2V2GatewayTool,
    PushNotificationTool,
)


def _flash_prompt(ctx: PollContext) -> str:
    return (
        "You help households save money and cut carbon. In one short paragraph, "
        "interpret this energy snapshot with an encouraging tone: "
        f"renewable_pct={ctx.renewable_pct}, "
        f"comed_cents={ctx.price_data.current_price if ctx.price_data else None}, "
        f"demand_mw={ctx.local_demand_mw}, eco_score={ctx.eco_efficiency_score}, "
        f"z_score={ctx.z_score}. No bullet points."
    )


def _pro_prompt(ctx: PollContext, history_tail: list[float]) -> str:
    tail = history_tail[-24:]
    return (
        "You are an energy coach focused on social good. Compare today's eco-efficiency "
        "signal with the user's recent scores. Explain volatility in simple terms and "
        "offer 2–3 practical load-shifting ideas. "
        f"history_tail={tail}, current={ctx.eco_efficiency_score}, "
        f"z={ctx.z_score}, renewable_pct={ctx.renewable_pct}, "
        f"price_cents={ctx.price_data.current_price if ctx.price_data else None}."
    )


def run_energy_poll(user_id: str, settings: Settings, *, dry_run: bool = False) -> PollContext:
    """
    One full poll: ComEd → GridStatus → score → Mongo history → optional LLM → push.
    Mirrors an Agent Zero tool chain; agents can import individual tools from `wattsup.tools`.
    """
    ctx = PollContext(user_id=user_id)
    comed = ComEd5MinTool()
    c_res = comed.run(ctx, settings)
    if not c_res.ok:
        raise RuntimeError(c_res.error or "ComEd tool failed")

    grid = GridStatusFuelMixTool()
    g_res = grid.run(ctx, settings)
    if not g_res.ok:
        ctx.fuel_mix = FuelMix()
        if ctx.renewable_pct is None:
            ctx.renewable_pct = 0.0
        if ctx.local_demand_mw is None:
            ctx.local_demand_mw = settings.fallback_demand_mw
    elif ctx.local_demand_mw is None:
        ctx.local_demand_mw = settings.fallback_demand_mw

    fuel = ctx.fuel_mix or FuelMix()
    renewable = ctx.renewable_pct if ctx.renewable_pct is not None else min(
        100.0,
        fuel.wind + fuel.solar + fuel.battery_storage,
    )
    demand = float(ctx.local_demand_mw or settings.fallback_demand_mw)
    if ctx.price_data is None:
        raise RuntimeError("Internal error: price_data missing after ComEd.")

    ctx.eco_efficiency_score = eco_efficiency_score(
        renewable,
        ctx.price_data.current_price,
        demand,
    )

    history: list[float] = []
    coll = None
    if not dry_run:
        coll = get_collection(settings)
        ensure_energy_logs_timeseries(coll)
        history = fetch_recent_scores(coll, user_id, settings.zscore_window)

    ctx.z_score = z_score(history, ctx.eco_efficiency_score)
    z_candidate = (
        ctx.z_score is not None and abs(ctx.z_score) >= settings.zscore_sigma
    )
    reasons: list[str] = []
    if dry_run:
        if z_candidate:
            reasons.append("zscore")
        if (
            settings.ideal_price_cents_max is not None
            and ctx.price_data is not None
            and ctx.price_data.current_price <= settings.ideal_price_cents_max
        ):
            reasons.append("ideal_price")
    else:
        alert_coll = get_alert_state_collection(settings)
        if settings.ideal_price_cents_max is not None:
            ideal_fire, ideal_update = ideal_price_should_notify(
                alert_coll,
                user_id,
                ctx.price_data.current_price,
                settings.ideal_price_cents_max,
            )
            merge_alert_state_update(alert_coll, user_id, ideal_update)
            if ideal_fire:
                reasons.append("ideal_price")
        if z_candidate:
            z_sign = 1 if (ctx.z_score or 0) > 0 else -1
            allow, z_update = zscore_cooldown_allows_notify(
                alert_coll,
                user_id,
                z_sign,
                settings.alert_cooldown_seconds,
            )
            if allow:
                reasons.append("zscore")
                merge_alert_state_update(alert_coll, user_id, z_update)

    notify = len(reasons) > 0
    ctx.notify_reasons = reasons

    k2 = K2V2GatewayTool()
    llm_route: str | None = None
    if settings.k2v2_base_url and settings.k2v2_api_key:
        llm_route = "flash"
        flash_res = k2.run_for(ctx, settings, "flash", _flash_prompt(ctx))
        if not flash_res.ok and flash_res.error:
            _log.warning("LLM flash failed: %s", flash_res.error)
        if notify and len(history) >= settings.pro_history_threshold:
            # Pro tier: K2 Think V2 (primary) → Gemini Pro (fallback)
            pro_prompt = _pro_prompt(ctx, history)
            if settings.k2_api_key:
                llm_route = "k2-think-v2"
                pro_res = k2.run_k2(ctx, settings, pro_prompt)
                if not pro_res.ok and pro_res.error:
                    _log.warning("K2 Think V2 failed, falling back to Gemini Pro: %s", pro_res.error)
                    llm_route = "pro"
                    pro_res = k2.run_for(ctx, settings, "pro", pro_prompt)
                    if not pro_res.ok and pro_res.error:
                        _log.warning("Gemini Pro fallback also failed: %s", pro_res.error)
            else:
                llm_route = "pro"
                pro_res = k2.run_for(ctx, settings, "pro", pro_prompt)
                if not pro_res.ok and pro_res.error:
                    _log.warning("LLM pro failed: %s", pro_res.error)

    if notify:
        hex_tool = HexRunTool()
        hex_tool.run(ctx, settings)

    action_taken = False
    if notify:
        push = PushNotificationTool()
        p_res = push.run(ctx, settings)
        action_taken = p_res.ok

    doc = EnergyLogDocument(
        user_id=user_id,
        timestamp=datetime.now(timezone.utc),
        price_data=ctx.price_data,
        fuel_mix=fuel,
        action_taken=action_taken,
    )
    extras: dict[str, Any] = {
        "eco_efficiency_score": ctx.eco_efficiency_score,
        "renewable_pct": renewable,
        "local_demand_mw": demand,
        "z_score": ctx.z_score,
        "gridstatus_ok": g_res.ok,
        "llm_route": llm_route,
    }
    if ctx.llm_analysis:
        extras["llm_analysis"] = ctx.llm_analysis
        extras["social_message"] = ctx.llm_analysis

    if not dry_run and coll is not None:
        enrich_and_insert(coll, doc, extras)

    ctx.notify = notify
    ctx.action_taken = action_taken
    return ctx
