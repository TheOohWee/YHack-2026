from __future__ import annotations

import re
from typing import Any, Literal

import httpx

from wattsup.config import Settings
from wattsup.models import PollContext
from wattsup.tools.base import AgentTool, ToolResult

_THINK_RE = re.compile(r"<think>.*?</think>", re.DOTALL)


class K2V2GatewayTool(AgentTool):
    name = "k2v2_gemini_route"
    description = (
        "Routes plain-language prompts: Flash via Lava/Gemini, "
        "Pro via K2 Think V2 (MBZUAI) for deep energy reasoning."
    )

    # ── Lava / Gemini (Flash tier) ──────────────────────────────────
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

    # ── K2 Think V2 (Pro tier) ──────────────────────────────────────
    def run_k2(
        self,
        ctx: PollContext,
        settings: Settings,
        user_prompt: str,
    ) -> ToolResult[str]:
        """Call K2 Think V2 directly for deep energy-domain reasoning."""
        if not settings.k2_api_key:
            return ToolResult(ok=True, data="")

        body = {
            "model": settings.k2_model,
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "You are a home energy efficiency expert powered by K2 Think V2. "
                        "Use your scientific reasoning to help households cut carbon and save money. "
                        "Always respond in plain, encouraging language."
                    ),
                },
                {"role": "user", "content": user_prompt},
            ],
            "temperature": 0.3,
            "max_tokens": 4000,
            "stream": False,
        }
        headers = {
            "Authorization": f"Bearer {settings.k2_api_key}",
            "Content-Type": "application/json",
        }
        try:
            with httpx.Client(timeout=settings.http_timeout_seconds) as client:
                r = client.post(settings.k2_endpoint, json=body, headers=headers)
                r.raise_for_status()
                data = r.json()
        except (httpx.HTTPError, ValueError, KeyError, TypeError) as e:
            return ToolResult(ok=False, error=f"K2 Think V2 call failed: {e}")

        try:
            text = data["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError):
            return ToolResult(ok=False, error="Unexpected K2 Think V2 response shape.")

        # Strip <think> reasoning tags — keep only the final answer.
        text = _THINK_RE.sub("", text).strip()
        ctx.llm_analysis = text
        return ToolResult(ok=True, data=text)

    def chat_completion(
        self,
        settings: Settings,
        messages: list[dict[str, str]],
        *,
        model: str | None = None,
        temperature: float = 0.2,
    ) -> ToolResult[str]:
        """OpenAI-compatible chat; used by the multi-step chat agent."""
        if not settings.k2v2_base_url or not settings.k2v2_api_key:
            return ToolResult(ok=False, error="LLM not configured (K2V2_BASE_URL / API key).")
        use_model = model or settings.gemini_flash_model
        url = settings.k2v2_base_url.rstrip("/") + "/v1/chat/completions"
        body = {
            "model": use_model,
            "messages": messages,
            "temperature": temperature,
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
            return ToolResult(ok=False, error=f"chat completion failed: {e}")
        try:
            text = data["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError):
            return ToolResult(ok=False, error="Unexpected chat completion response shape.")
        return ToolResult(ok=True, data=text)

    def run(self, ctx: PollContext, settings: Settings) -> ToolResult[str]:
        """Registry hook; orchestration calls `run_for` / `run_k2` directly."""
        return ToolResult(ok=True, data=None)
