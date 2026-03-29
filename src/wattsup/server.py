"""Local HTTP API for WattsUp (health, poll, agent chat, Slack/Telegram webhooks)."""

from __future__ import annotations

import json
import logging
import re
from typing import Any

import httpx
from fastapi import BackgroundTasks, FastAPI, HTTPException, Request
from pydantic import BaseModel, Field

from wattsup.config import Settings
from wattsup.orchestrator import run_energy_poll
from wattsup.slack_agent_bridge import (
    agent_reply_for_user,
    slack_post_message,
    slack_user_message_complete,
)
from wattsup.slack_socket import start_slack_socket_background
from wattsup.slack_util import verify_slack_request

logging.getLogger("gridstatus").setLevel(logging.WARNING)
logging.getLogger("gridstatusio").setLevel(logging.WARNING)

_log = logging.getLogger("wattsup.server")

app = FastAPI(
    title="WattsUp",
    version="0.2.0",
    description="Eco-quant energy poll API + enterprise chat agent (Slack / Telegram).",
)


class PollRequest(BaseModel):
    user_id: str = Field(..., min_length=1)
    dry_run: bool = False


class ChatRequest(BaseModel):
    user_id: str = Field(..., min_length=1)
    message: str = Field(..., min_length=1, max_length=8000)


def _telegram_send(settings: Settings, chat_id: int | str, text: str) -> None:
    if not settings.telegram_bot_token:
        return
    url = f"https://api.telegram.org/bot{settings.telegram_bot_token}/sendMessage"
    with httpx.Client(timeout=settings.http_timeout_seconds) as client:
        r = client.post(url, json={"chat_id": chat_id, "text": text[:4000]})
        r.raise_for_status()


def _handle_slack_payload(data: dict[str, Any], settings: Settings) -> None:
    if data.get("type") == "url_verification":
        return
    if data.get("type") != "event_callback":
        return
    ev = data.get("event") or {}
    if ev.get("type") not in ("message", "app_mention"):
        return
    if ev.get("bot_id") or ev.get("subtype") in ("bot_message", "message_changed"):
        return
    text = (ev.get("text") or "").strip()
    if not text:
        return
    text = re.sub(r"<@[^>\s]+>\s*", "", text).strip()
    if not text:
        return
    channel = ev.get("channel")
    if not channel:
        return
    thread_ts = ev.get("thread_ts") or ev.get("ts")
    user_id = settings.wattsup_default_user_id
    slack_user_message_complete(
        settings, user_id, str(channel), thread_ts, text
    )


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/poll")
def poll(body: PollRequest) -> dict:
    settings = Settings()
    try:
        ctx = run_energy_poll(body.user_id, settings, dry_run=body.dry_run)
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e
    return {
        "user_id": ctx.user_id,
        "eco_efficiency_score": ctx.eco_efficiency_score,
        "renewable_pct": ctx.renewable_pct,
        "z_score": ctx.z_score,
        "notify": ctx.notify,
        "notify_reasons": ctx.notify_reasons,
        "action_taken": ctx.action_taken,
    }


@app.post("/agent/chat")
def agent_chat(body: ChatRequest) -> dict:
    settings = Settings()
    try:
        reply = agent_reply_for_user(settings, body.user_id, body.message)
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e
    return {"user_id": body.user_id, "reply": reply}


@app.post("/webhooks/slack")
async def slack_events(request: Request, background_tasks: BackgroundTasks) -> dict:
    settings = Settings()
    body = await request.body()
    if settings.slack_signing_secret:
        sig = request.headers.get("X-Slack-Signature", "")
        ts = request.headers.get("X-Slack-Request-Timestamp", "")
        if not verify_slack_request(settings.slack_signing_secret, sig, ts, body):
            raise HTTPException(status_code=401, detail="Invalid Slack signature")
    try:
        data = json.loads(body.decode("utf-8"))
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=400, detail=f"Invalid JSON: {e}") from e

    if data.get("type") == "url_verification":
        return {"challenge": data.get("challenge")}

    background_tasks.add_task(_handle_slack_payload, data, settings)
    return {"ok": True}


@app.post("/webhooks/telegram")
async def telegram_webhook(request: Request, background_tasks: BackgroundTasks) -> dict:
    settings = Settings()
    try:
        data = await request.json()
    except json.JSONDecodeError:
        return {"ok": True}

    msg = data.get("message") or data.get("edited_message")
    if not msg or not isinstance(msg, dict):
        return {"ok": True}
    chat = msg.get("chat") or {}
    chat_id = chat.get("id")
    text = (msg.get("text") or "").strip()
    if not chat_id or not text:
        return {"ok": True}

    def respond() -> None:
        user_id = settings.wattsup_default_user_id
        try:
            reply = agent_reply_for_user(settings, user_id, text)
        except Exception:
            _log.exception("telegram agent failed")
            reply = "Sorry — the agent hit an error. Check server logs."
        try:
            _telegram_send(settings, chat_id, reply)
        except httpx.HTTPError as e:
            _log.warning("telegram send failed: %s", e)

    background_tasks.add_task(respond)
    return {"ok": True}


def main() -> None:
    import logging as logging_stdlib
    import uvicorn

    logging_stdlib.basicConfig(
        level=logging_stdlib.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    s = Settings()
    thread = start_slack_socket_background(s)
    if thread:
        _log.info("Slack Socket Mode thread started (mention @your-bot or subscribe message.channels)")
    uvicorn.run(app, host=s.wattsup_host, port=s.wattsup_port)


if __name__ == "__main__":
    main()
