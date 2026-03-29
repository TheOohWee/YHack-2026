"""Slack / WattWise explicit opt-in rows — credits an **active** streak win."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any

from wattsup.config import Settings
from wattsup.demo_hardware import user_triggers_energy_optimize_demo
from wattsup.db import (
    enrich_and_insert,
    fetch_latest_energy_row,
    get_alert_state_collection,
    get_collection,
    merge_alert_state_update,
)
from wattsup.models import EnergyLogDocument, FuelMix, PriceData
from wattsup.streaks import update_green_streak_for_user

_log = logging.getLogger(__name__)

_WATTWISE_COOLDOWN = timedelta(hours=6)


def _wattwise_trigger(user_text: str) -> bool:
    t = user_text.lower().strip()
    compact = "".join(t.split())
    if "wattwise-optimize" in t or "wattwise-optimize" in compact or "/wattwise-optimize" in t:
        return True
    return "wattwise" in t and "optim" in t


def _slack_active_streak_trigger(user_text: str) -> bool:
    """WattWise slash text or the same phrases that trigger the local eco demo."""
    return _wattwise_trigger(user_text) or user_triggers_energy_optimize_demo(user_text)


def maybe_record_wattwise_slack_opt_in(
    settings: Settings, user_id: str, user_text: str
) -> None:
    """Clone the latest poll with ``action_taken=True`` so the streak engine credits an active win day."""
    if not _slack_active_streak_trigger(user_text):
        return

    coll = get_collection(settings)
    alert_coll = get_alert_state_collection(settings)
    st = alert_coll.find_one({"user_id": user_id}) or {}
    last_syn = st.get("wattwise_synthetic_at")
    now = datetime.now(timezone.utc)
    if isinstance(last_syn, datetime):
        if now - last_syn.astimezone(timezone.utc) < _WATTWISE_COOLDOWN:
            _log.debug("wattwise synthetic skipped: cooldown user=%s", user_id)
            return

    last = fetch_latest_energy_row(coll, user_id)
    if not last:
        _log.debug("wattwise synthetic skipped: no energy_logs for user=%s", user_id)
        return

    pd_raw = last.get("price_data")
    fm_raw = last.get("fuel_mix")
    if not isinstance(pd_raw, dict) or not isinstance(fm_raw, dict):
        return

    try:
        pd = PriceData(
            current_price=float(pd_raw["current_price"]),
            avg_24h=float(pd_raw.get("avg_24h", pd_raw["current_price"])),
        )
        mix = FuelMix.model_validate(fm_raw)
    except Exception:
        _log.warning("wattwise synthetic: could not parse latest row for user=%s", user_id)
        return

    doc = EnergyLogDocument(
        user_id=user_id,
        timestamp=now,
        price_data=pd,
        fuel_mix=mix,
        action_taken=True,
    )
    from_help = user_triggers_energy_optimize_demo(user_text) and not _wattwise_trigger(
        user_text
    )
    extras: dict[str, Any] = {
        "eco_efficiency_score": last.get("eco_efficiency_score"),
        "renewable_pct": last.get("renewable_pct"),
        "local_demand_mw": last.get("local_demand_mw"),
        "z_score": last.get("z_score"),
        "grid_stress_z": last.get("grid_stress_z"),
        "gridstatus_ok": last.get("gridstatus_ok", True),
        "slack_active_streak_opt_in": True,
        "slack_optimize_help_opt_in": bool(from_help),
        "slack_wattwise_opt_in": bool(not from_help),
    }
    for key in ("total_dollars_saved", "total_carbon_saved_kg", "llm_route"):
        if last.get(key) is not None:
            extras[key] = last[key]

    enrich_and_insert(coll, doc, extras)
    merge_alert_state_update(alert_coll, user_id, {"wattwise_synthetic_at": now})
    try:
        update_green_streak_for_user(settings, user_id)
    except Exception:
        _log.exception("wattwise streak update failed user=%s", user_id)
