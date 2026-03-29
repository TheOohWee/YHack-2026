from __future__ import annotations

from typing import Any

import httpx

from wattsup.config import Settings
from wattsup.models import PollContext
from wattsup.tools.base import AgentTool, ToolResult


class HexRunTool(AgentTool):
    name = "hex_scheduled_run"
    description = "Triggers a Hex project or notebook run via HTTP (HEX_RUN_URL + HEX_API_KEY)."

    def run(self, ctx: PollContext, settings: Settings) -> ToolResult[dict]:
        if not settings.hex_run_url or not settings.hex_api_key:
            return ToolResult(ok=True, data={"skipped": True, "reason": "Hex not configured."})

        headers = {"Authorization": f"Bearer {settings.hex_api_key}"}
        payload = {
            "user_id": ctx.user_id,
            "eco_efficiency_score": ctx.eco_efficiency_score,
            "z_score": ctx.z_score,
            "notify": ctx.notify,
        }
        try:
            with httpx.Client(timeout=settings.http_timeout_seconds) as client:
                r = client.post(settings.hex_run_url, json=payload, headers=headers)
                r.raise_for_status()
        except httpx.HTTPError as e:
            return ToolResult(ok=False, error=f"Hex run request failed: {e}")

        ctx.hex_triggered = True
        try:
            body = r.json()
        except ValueError:
            body = {"status_code": r.status_code, "text": r.text[:500]}
        return ToolResult(ok=True, data=body)
