# WattsUp — enterprise energy agent

Personal agent track demo: **proactive price & grid alerts** plus **chat** (HTTP, Slack, Telegram) with a **multi-step tool loop** (Mongo snapshot → optional live poll → grounded LLM answer).

## What runs where

| Piece | Role |
|--------|------|
| `wattsup-worker` / `POST /poll` | Polls ComEd + PJM mix, scores, logs to Mongo, fires pushes when rules hit |
| `wattsup-serve` | FastAPI: `/poll`, `/agent/chat`, `/webhooks/slack`, `/webhooks/telegram` |
| MongoDB `energy_logs` | Time-series history; chat tools read from here |
| MongoDB `alert_state` | Edge + cooldown state so alerts are not spammy |

## Alert logic (reliable defaults)

- **z-score**: same as before — `|z| ≥ ZSCORE_SIGMA`, with **cooldown** so the same “side” does not push again within `ALERT_COOLDOWN_SECONDS`.
- **Ideal price** (optional): set `IDEAL_PRICE_CENTS_MAX`. When ComEd 5m price **drops into** the band from above, you get **one** edge-triggered push; it rearms when price goes back above the threshold.

Push text includes `notify_reasons` (e.g. `zscore`, `ideal_price`). Channels: **Slack Incoming Webhook**, **Telegram**, **WhatsApp webhook** (best-effort across configured channels).

## Chat agent

- **`POST /agent/chat`** JSON: `{"user_id":"...", "message":"..."}`.

The model plans **JSON tool calls** (`mongo_latest`, `mongo_history`, `live_poll`). Observations are injected; the model must produce a **`final`** string grounded in tool output. Requires `K2V2_BASE_URL` + `K2V2_API_KEY` (or `LAVA_*`). Without them, the API falls back to a short summary from the latest Mongo row.

## Slack (Events API — public HTTPS URL)

1. Create an app, enable **Event Subscriptions**, set Request URL to `https://<your-host>/webhooks/slack`.
2. Subscribe to `message.channels` (or DMs as needed).
3. Set **SLACK_SIGNING_SECRET**, **SLACK_BOT_TOKEN** (`chat:write`), install app to workspace.
4. Map chat to energy user via **WATTSUP_DEFAULT_USER_ID** (match your worker `--user-id`).

## Slack (Socket Mode — no public URL)

If **Socket Mode** is on, Slack does **not** POST events to `/webhooks/slack`; you need an **App-Level Token** and Bolt opens a WebSocket.

1. Slack app → **Basic Information** → **App-Level Tokens** → create token with scope **`connections:write`** → put it in **`SLACK_APP_TOKEN`** (`xapp-…`).
2. **OAuth & Permissions** → **Bot Token Scopes** (minimum that usually fixes “bot never replies”):
   - **`chat:write`**
   - **`app_mentions:read`**
   - **`channels:history`** (public channels)
   - **`groups:history`** (private channels, if used)
   - **`im:history`** (DMs, if used)
3. **Event Subscriptions** → enable events → under **Subscribe to bot events** add at least **`app_mention`** (for `@YourBot hello`) and/or **`message.channels`** (for all channel messages). **Re-install the app** to the workspace after changing scopes or events.
4. Invite the bot: `/invite @YourBot` in the channel.
5. Set **`SLACK_BOT_TOKEN`** (`xoxb-…`), run **`wattsup-serve`** (Socket Mode runs in a background thread).
6. Optional **`SLACK_SIGNING_SECRET`** is only for HTTP `/webhooks/slack`; **`SLACK_WEBHOOK_URL`** is only for **outgoing** proactive alerts.

If the bot still never answers: run `wattsup-serve` in a terminal and watch for `slack agent:` log lines when you post in Slack — if nothing appears, Slack is not delivering events (scopes / event list / reinstall / channel membership).

## Telegram (webhook replies)

1. Set **TELEGRAM_BOT_TOKEN**.
2. `POST https://api.telegram.org/bot<token>/setWebhook` with `url` = `https://<your-host>/webhooks/telegram`.
3. Users messaging the bot get replies via `sendMessage` to the same chat. Proactive alerts still use **TELEGRAM_CHAT_ID** if set.

## Quick start (Python ≥ 3.11)

```bash
cp .env.example .env
# fill MONGODB_URI, GRIDSTATUS_API_KEY, K2V2_*, optional SLACK_* / TELEGRAM_* / IDEAL_PRICE_CENTS_MAX

pip install -e .
wattsup-serve
# elsewhere:
wattsup-worker --user-id default
```

Health: `GET http://127.0.0.1:8000/health`.

## Env reference

See `.env.example` for `IDEAL_PRICE_CENTS_MAX`, `ALERT_COOLDOWN_SECONDS`, `SLACK_WEBHOOK_URL`, `SLACK_SIGNING_SECRET`, `SLACK_BOT_TOKEN`, `WATTSUP_DEFAULT_USER_ID`, and chat model keys.
