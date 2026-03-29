"""Slack Socket Mode: receive message / app_mention events over WebSocket (no Request URL)."""

from __future__ import annotations

import logging
import re
import threading
import time
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from slack_bolt import App

_log = logging.getLogger(__name__)

_DEDUPE_LOCK = threading.Lock()
_DEDUPE: dict[str, float] = {}
_DEDUPE_TTL_SEC = 5.0


def _strip_mentions(text: str) -> str:
    return re.sub(r"<@[^>\s]+>\s*", "", text).strip()


def _dedupe_consume(channel: str, ts: str | None) -> bool:
    """True = handle; False = duplicate (same message often emits message + app_mention)."""
    if not ts:
        return True
    key = f"{channel}:{ts}"
    now = time.monotonic()
    with _DEDUPE_LOCK:
        for k, t in list(_DEDUPE.items()):
            if now - t > _DEDUPE_TTL_SEC:
                del _DEDUPE[k]
        if key in _DEDUPE:
            _log.debug("slack dedupe skip channel=%s ts=%s", channel, ts)
            return False
        _DEDUPE[key] = now
    return True


def _process_slack_user_message(settings: Any, event: dict[str, Any]) -> None:
    from wattsup.slack_agent_bridge import agent_reply_for_user, slack_post_message

    channel = event.get("channel")
    if not channel:
        _log.warning("slack event missing channel (type=%s)", event.get("type"))
        return
    ts = event.get("ts") or event.get("event_ts")
    if not _dedupe_consume(str(channel), str(ts) if ts else None):
        return

    text = (event.get("text") or "").strip()
    text = _strip_mentions(text)
    if not text:
        _log.info("slack: empty text after stripping mentions channel=%s", channel)
        return

    thread_ts = event.get("thread_ts") or event.get("ts")
    user_id = settings.wattsup_default_user_id
    _log.info(
        "slack agent: user_id=%s channel=%s preview=%r",
        user_id,
        channel,
        text[:100],
    )
    try:
        reply = agent_reply_for_user(settings, user_id, text)
    except Exception:
        _log.exception("slack socket agent failed")
        reply = "Sorry — the agent hit an error. Check server logs."
    slack_post_message(settings, str(channel), reply, str(thread_ts) if thread_ts else None)


def _build_bolt_app(settings: Any) -> App:
    from slack_bolt import App

    kwargs: dict[str, Any] = {"token": settings.slack_bot_token}
    if settings.slack_signing_secret:
        kwargs["signing_secret"] = settings.slack_signing_secret
    bolt_app = App(**kwargs)

    @bolt_app.event("message")
    def handle_message(event: dict[str, Any]) -> None:
        if event.get("bot_id") or event.get("subtype") in (
            "bot_message",
            "message_changed",
            "message_deleted",
            "channel_join",
            "channel_leave",
            "group_join",
        ):
            return
        _process_slack_user_message(settings, event)

    @bolt_app.event("app_mention")
    def handle_app_mention(event: dict[str, Any]) -> None:
        """Required if the app only subscribes to app_mention (common default)."""
        _process_slack_user_message(settings, event)

    return bolt_app


def start_slack_socket_background(settings: Any) -> threading.Thread | None:
    """
    Start Bolt Socket Mode in a daemon thread. Returns None if not configured.
    Requires SLACK_BOT_TOKEN + SLACK_APP_TOKEN and: pip install slack-bolt
    """
    if not settings.slack_bot_token or not settings.slack_app_token:
        _log.info(
            "Slack Socket Mode skipped (need SLACK_BOT_TOKEN and SLACK_APP_TOKEN in .env)"
        )
        return None
    try:
        from slack_bolt.adapter.socket_mode import SocketModeHandler
    except ImportError as e:
        _log.warning(
            "Slack Socket Mode requires slack-bolt: pip install slack-bolt (%s)",
            e,
        )
        return None

    bolt_app = _build_bolt_app(settings)
    handler = SocketModeHandler(bolt_app, settings.slack_app_token)

    def run() -> None:
        _log.info("Slack Socket Mode: starting (blocks this thread until disconnect)")
        try:
            handler.start()
        except Exception:
            _log.exception("Slack Socket Mode exited with error")

    t = threading.Thread(target=run, name="slack-socket-mode", daemon=True)
    t.start()
    return t
