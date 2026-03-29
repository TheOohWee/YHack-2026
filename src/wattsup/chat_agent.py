from __future__ import annotations

import json
import logging
import re
from typing import Any

from wattsup.config import Settings
from wattsup.db import (
    fetch_latest_energy_row,
    fetch_recent_energy_rows,
    get_collection,
)
from wattsup.orchestrator import run_energy_poll
from wattsup.tools.llm_gateway import K2V2GatewayTool

_log = logging.getLogger(__name__)

_MAX_STEPS = 4

_TOOL_DOC = """
Tools you may request (array may be empty). Each item: {"name":"<name>","arguments":{...}}

- mongo_latest — arguments: {}. Reads the latest stored energy log (price, score, renewables).
- mongo_history — arguments: {"limit": 12}. Recent logs with timestamps, scores, and prices.
- live_poll — arguments: {}. Runs a full live ComEd + grid pull (slower). Use only if the user
  explicitly needs up-to-the-minute data not in the database.
"""

_SYSTEM = f"""You are WattsUp, an enterprise personal agent for Illinois ComEd real-time pricing and PJM grid mix.
Ground every number in tool observations; if a field is missing, say you don't have it yet.
Give 2–4 short actionable sentences. Tone: clear, professional, not hype.
Write the user-facing "final" field in plain text only: no **bold**, no # headings, no markdown links, no backticks.
Use short lines; if you need steps, use "1) " / "2) " not bullet markdown.

{_TOOL_DOC}

Output rules: reply with ONE JSON object only (no markdown fences). Schema:
{{"tools":[{{"name":"mongo_latest","arguments":{{}}}}],"final":null}}
Use "final" for the user-facing answer only when you need no more tools — non-null string means you are done.
"""


def _strip_json_fence(raw: str) -> str:
    s = raw.strip()
    if s.startswith("```"):
        s = re.sub(r"^```(?:json)?\s*", "", s)
        s = re.sub(r"\s*```$", "", s)
    return s.strip()


def _parse_agent_response(raw: str) -> dict[str, Any]:
    s = _strip_json_fence(raw)
    return json.loads(s)


def _summarize_row(row: dict[str, Any] | None) -> dict[str, Any]:
    if not row:
        return {"found": False}
    ts = row.get("timestamp")
    ts_s = ts.isoformat() if hasattr(ts, "isoformat") else str(ts)
    pd = row.get("price_data") or {}
    return {
        "found": True,
        "timestamp": ts_s,
        "eco_efficiency_score": row.get("eco_efficiency_score"),
        "z_score": row.get("z_score"),
        "renewable_pct": row.get("renewable_pct"),
        "price_cents": pd.get("current_price") if isinstance(pd, dict) else None,
        "avg_24h_cents": pd.get("avg_24h") if isinstance(pd, dict) else None,
        "llm_analysis_excerpt": (row.get("llm_analysis") or "")[:400] or None,
    }


def _run_tool(
    name: str,
    arguments: dict[str, Any],
    user_id: str,
    settings: Settings,
) -> dict[str, Any]:
    if name == "mongo_latest":
        coll = get_collection(settings)
        row = fetch_latest_energy_row(coll, user_id)
        return {"tool": name, "result": _summarize_row(row)}
    if name == "mongo_history":
        limit = int(arguments.get("limit") or 12)
        limit = max(1, min(limit, 48))
        coll = get_collection(settings)
        rows = fetch_recent_energy_rows(coll, user_id, limit)
        slim = []
        for r in rows:
            pd = r.get("price_data") or {}
            ts = r.get("timestamp")
            ts_s = ts.isoformat() if hasattr(ts, "isoformat") else str(ts)
            slim.append(
                {
                    "timestamp": ts_s,
                    "score": r.get("eco_efficiency_score"),
                    "z": r.get("z_score"),
                    "price_cents": pd.get("current_price") if isinstance(pd, dict) else None,
                }
            )
        return {"tool": name, "result": {"rows": slim, "count": len(slim)}}
    if name == "live_poll":
        ctx = run_energy_poll(user_id, settings, dry_run=False)
        return {
            "tool": name,
            "result": {
                "eco_efficiency_score": ctx.eco_efficiency_score,
                "z_score": ctx.z_score,
                "renewable_pct": ctx.renewable_pct,
                "price_cents": ctx.price_data.current_price if ctx.price_data else None,
                "notify_reasons": ctx.notify_reasons,
            },
        }
    return {"tool": name, "error": f"unknown tool: {name}"}


def run_chat_agent(
    user_id: str,
    user_message: str,
    settings: Settings,
) -> tuple[str, list[dict[str, Any]]]:
    """
    Multi-step tool loop: plan → execute tools → final natural-language answer.
    Returns (reply_text, trace for debugging).
    """
    gateway = K2V2GatewayTool()
    trace: list[dict[str, Any]] = []
    messages: list[dict[str, str]] = [
        {"role": "system", "content": _SYSTEM},
        {"role": "user", "content": user_message},
    ]

    for step in range(_MAX_STEPS):
        res = gateway.chat_completion(settings, messages, temperature=0.15)
        if not res.ok or not res.data:
            err = res.error or "LLM error"
            _log.warning("chat agent LLM step failed: %s", err)
            trace.append({"step": step, "error": err})
            return (
                "I could not reach the language model. Check K2V2_BASE_URL / API key, then try again.",
                trace,
            )
        text = res.data
        trace.append({"step": step, "raw": text[:2000]})
        try:
            parsed = _parse_agent_response(text)
        except json.JSONDecodeError as e:
            trace.append({"step": step, "parse_error": str(e)})
            return (
                "The agent returned an unexpected format. Please rephrase your question.",
                trace,
            )

        final = parsed.get("final")
        if isinstance(final, str) and final.strip():
            return final.strip(), trace

        tools = parsed.get("tools") or []
        if not isinstance(tools, list) or not tools:
            return (
                "I need one more specific question (e.g. current price vs. your last log, or whether to shift loads).",
                trace,
            )

        observations: list[dict[str, Any]] = []
        for spec in tools[:5]:
            if not isinstance(spec, dict):
                continue
            tname = spec.get("name")
            if not isinstance(tname, str):
                continue
            targs = spec.get("arguments") or {}
            if not isinstance(targs, dict):
                targs = {}
            observations.append(_run_tool(tname, targs, user_id, settings))

        messages.append({"role": "assistant", "content": text})
        messages.append(
            {
                "role": "user",
                "content": "Tool results (JSON):\n"
                + json.dumps(observations, default=str)[:12000]
                + "\nNow reply with JSON: either more tools or a non-null final answer.",
            },
        )

    return (
        "I hit the reasoning step limit. Ask a narrower question (e.g. 'latest logged price?').",
        trace,
    )


def answer_without_llm(user_id: str, settings: Settings) -> str:
    """Fallback when no LLM is configured."""
    coll = get_collection(settings)
    row = fetch_latest_energy_row(coll, user_id)
    summ = _summarize_row(row)
    if not summ.get("found"):
        return (
            "No saved energy logs yet. Run a poll first (`wattsup-poll` or POST /poll), "
            "then ask again."
        )
    return (
        f"Latest log at {summ.get('timestamp')}: price about {summ.get('price_cents')}¢, "
        f"eco-efficiency score {summ.get('eco_efficiency_score')}, "
        f"z≈{summ.get('z_score')}, renewables ~{summ.get('renewable_pct')}%. "
        "Configure K2V2_BASE_URL and API key for full agent recommendations."
    )
