from __future__ import annotations

from typing import Any, Literal

import httpx

from wattsup.config import Settings
from wattsup.models import PollContext
from wattsup.tools.base import AgentTool, ToolResult


class K2V2GatewayTool(AgentTool):
    name = "k2v2_gemini_route"
    description = (
        "Routes plain-language prompts through K2V2/Lava (OpenAI-compatible): "
        "simple text uses Gemini Flash, deeper analysis uses Gemini Pro."
    )

    def run_for(
        self,
        ctx: PollContext,
        settings: Settings,
        mode: Literal["flash", "pro"],
        user_prompt: str,
    ) -> ToolResult[str]:
        if not settings.k2v2_base_url or not settings.k2v2_api_key:
            return ToolResult(
                ok=True,
                data="",
            )

        model = (
            settings.gemini_flash_model if mode == "flash" else settings.gemini_pro_model
        )
        url = settings.k2v2_base_url.rstrip("/") + "/v1/chat/completions"
        body = {
            "model": model,
            "messages": [{"role": "user", "content": user_prompt}],
            "temperature": 0.4,
        }
        headers = {
            "Authorization": f"Bearer {settings.k2v2_api_key}",
            "Content-Type": "application/json",
        }
        try:
            with httpx.Client(timeout=settings.http_timeout_seconds) as client:
                r = client.post(url, json=body, headers=headers)
                r.raise_for_status()
                data = r.json()
        except (httpx.HTTPError, ValueError, KeyError, TypeError) as e:
            return ToolResult(ok=False, error=f"K2V2 chat completion failed: {e}")

        try:
            text = data["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError):
            return ToolResult(ok=False, error="Unexpected K2V2 response shape.")
        ctx.llm_analysis = text
        return ToolResult(ok=True, data=text)

    def run(self, ctx: PollContext, settings: Settings) -> ToolResult[str]:
        """Registry hook; orchestration calls `run_for` with the routed model."""
        return ToolResult(ok=True, data=None)
