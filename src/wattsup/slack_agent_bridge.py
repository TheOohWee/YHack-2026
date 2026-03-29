"""Slack agent replies (shared by HTTP Events API and Socket Mode)."""

from __future__ import annotations

import logging
from typing import Any

import httpx

from wattsup.chat_agent import answer_without_llm, run_chat_agent
from wattsup.config import Settings
from wattsup.demo_hardware import maybe_local_eco_followup
from wattsup.plain_text import format_user_facing_reply

_log = logging.getLogger(__name__)


def agent_reply_for_user(settings: Settings, user_id: str, question: str) -> str:
    if settings.k2v2_base_url and settings.k2v2_api_key:
        reply, _trace = run_chat_agent(user_id, question, settings)
    else:
        reply = answer_without_llm(user_id, settings)
    return format_user_facing_reply(reply)


def slack_post_message(
    settings: Settings, channel: str, text: str, thread_ts: str | None = None
) -> None:
    if not settings.slack_bot_token:
        _log.warning("Slack: SLACK_BOT_TOKEN not set")
        return
    text = format_user_facing_reply(text)
    body: dict[str, Any] = {"channel": channel, "text": text[:4000]}
    if thread_ts:
        body["thread_ts"] = thread_ts
    with httpx.Client(timeout=settings.http_timeout_seconds) as client:
        r = client.post(
            "https://slack.com/api/chat.postMessage",
            headers={"Authorization": f"Bearer {settings.slack_bot_token}"},
            json=body,
        )
        r.raise_for_status()
        data = r.json()
        if not data.get("ok"):
            _log.warning("chat.postMessage failed: %s", data)


def slack_user_message_complete(
    settings: Settings,
    user_id: str,
    channel: str,
    thread_ts: str | None,
    user_text: str,
) -> None:
    """
    Agent reply in Slack, then optional local display-dim follow-up when
    WATTSUP_DEMO_LOCAL_ECO=true and user_text asks to optimize energy usage.
    """
    try:
        reply = agent_reply_for_user(settings, user_id, user_text)
    except Exception:
        _log.exception("slack agent failed")
        reply = "Sorry — the agent hit an error. Check server logs."
    slack_post_message(settings, channel, reply, thread_ts)
    follow = maybe_local_eco_followup(settings, user_text)
    if follow:
        slack_post_message(settings, channel, follow, thread_ts)
