from __future__ import annotations

from typing import Any

import httpx

from wattsup.config import Settings
from wattsup.models import PollContext
from wattsup.tools.base import AgentTool, ToolResult


def _friendly_alert(ctx: PollContext) -> str:
    score = ctx.eco_efficiency_score
    z = ctx.z_score
    price = ctx.price_data.current_price if ctx.price_data else None
    ren = ctx.renewable_pct
    score_s = f"{score:.2f}" if score is not None else "n/a"
    z_s = f"{z:+.2f}" if z is not None else "n/a"
    ren_s = f"{ren:.1f}" if ren is not None else "n/a"
    price_s = f"{price:.2f}¢" if price is not None else "n/a"
    return (
        "Great news — your grid just sent a strong eco-efficiency signal worth a look. "
        f"Eco-efficiency score: {score_s} (about {z_s}σ vs your recent average). "
        f"Roughly {ren_s}% renewables on the regional mix, ComEd price near {price_s}. "
        "Small shifts in when you use power can trim both cost and carbon — "
        "you are already making a smarter choice by staying informed."
    )


class PushNotificationTool(AgentTool):
    name = "push_notification"
    description = "Sends encouraging alerts via Telegram and/or OpenClaw-style WhatsApp webhook."

    def run(self, ctx: PollContext, settings: Settings) -> ToolResult[dict]:
        analysis = (ctx.llm_analysis or "").strip()
        text = analysis if analysis else _friendly_alert(ctx)
        results: dict = {}

        if settings.telegram_bot_token and settings.telegram_chat_id:
            url = (
                f"https://api.telegram.org/bot{settings.telegram_bot_token}/sendMessage"
            )
            try:
                with httpx.Client(timeout=settings.http_timeout_seconds) as client:
                    r = client.post(
                        url,
                        json={"chat_id": settings.telegram_chat_id, "text": text},
                    )
                    r.raise_for_status()
                results["telegram"] = "sent"
            except httpx.HTTPError as e:
                return ToolResult(ok=False, error=f"Telegram push failed: {e}")

        if settings.whatsapp_webhook_url:
            try:
                with httpx.Client(timeout=settings.http_timeout_seconds) as client:
                    r = client.post(
                        settings.whatsapp_webhook_url,
                        json={"user_id": ctx.user_id, "text": text},
                    )
                    r.raise_for_status()
                results["whatsapp_webhook"] = "sent"
            except httpx.HTTPError as e:
                return ToolResult(ok=False, error=f"WhatsApp webhook push failed: {e}")

        if not results:
            return ToolResult(
                ok=False,
                error="No push channel configured (Telegram or WHATSAPP_WEBHOOK_URL).",
            )

        return ToolResult(ok=True, data=results)
