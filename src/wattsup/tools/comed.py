from __future__ import annotations

import statistics
from typing import Any

import httpx

from wattsup.config import Settings
from wattsup.models import PollContext, PriceData
from wattsup.tools.base import AgentTool, ToolResult


class ComEd5MinTool(AgentTool):
    name = "comed_5min_prices"
    description = "Fetches ComEd residential real-time 5-minute price feed (JSON)."

    def run(self, ctx: PollContext, settings: Settings) -> ToolResult[PriceData]:
        try:
            with httpx.Client(timeout=settings.http_timeout_seconds) as client:
                r = client.get(settings.comed_5min_url)
                r.raise_for_status()
                rows = r.json()
        except (httpx.HTTPError, ValueError, TypeError) as e:
            return ToolResult(ok=False, error=f"ComEd request failed: {e}")

        if not rows or not isinstance(rows, list):
            return ToolResult(ok=False, error="ComEd returned an unexpected payload.")

        parsed: list[tuple[int, float]] = []
        for item in rows:
            if not isinstance(item, dict):
                continue
            try:
                ms = int(item["millisUTC"])
                price = float(item["price"])
            except (KeyError, TypeError, ValueError):
                continue
            parsed.append((ms, price))

        if not parsed:
            return ToolResult(ok=False, error="No price points parsed from ComEd feed.")

        parsed.sort(key=lambda x: x[0])
        current = parsed[-1][1]
        avg_24h = float(statistics.mean(p[1] for p in parsed))
        ctx.price_data = PriceData(current_price=current, avg_24h=avg_24h)
        return ToolResult(ok=True, data=ctx.price_data)
