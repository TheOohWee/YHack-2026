# WattsUp

YHack 2026 | March 28-29

### Team: Shreyas, Amir, Alan, Heidi

---
Care about the environment and your wallet? WattsUp analyzes real-time electricity prices and grid fuel mix using deep reasoning to tell you exactly when to use power to save money and slash your carbon footprint! Compete with friends on green streaks, upload your electricity bills, ask chatbots, get notifications, climb the leaderboard, and turn saving the planet into a social challenge.

## What is WattsUp?

Electricity prices change every five minutes. Most people have no idea when power is cheap, when the grid is running on clean energy, or how much they could save just by shifting when they run the dishwasher or charge their car.

WattsUp fixes that. It is a real-time energy assistant that watches the grid for you, tells you when to use power and when to hold off, and tracks how much money and carbon you save over time.

You sign in, connect to your local utility (ComEd in Illinois), and the app starts working immediately. Every five minutes it pulls live pricing data and the regional fuel mix, scores how "green" and affordable the grid is right now, and sends you a push alert if something interesting happens — like prices dropping to a historic low or renewables spiking. You can also chat with the agent directly (on the web, Slack, or Telegram) and ask things like "should I run my laundry now?" or upload your electricity bill for a breakdown of where your money is going.

### Why we built it

Energy waste is one of those problems that feels too big for any one person to solve. But small behavior changes — running heavy appliances during off-peak hours, noticing when wind generation is high — actually add up. The issue is that nobody has time to check grid dashboards. We wanted to build something that does the watching for you and nudges you at the right moment, so saving money and reducing emissions becomes effortless.

### Why it matters

- **Financial** — Real-time price awareness helps households avoid peak pricing and cut electricity bills without changing their lifestyle, just their timing.
- **Environmental** — When you shift consumption to high-renewable windows, you reduce the demand that utilities fill with gas and coal. Multiply that across thousands of households and the impact is real.
- **Social** — Green streaks, leaderboards, and friend comparisons turn energy saving into something visible and shared. Sustainability works better when it is not invisible.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Backend** | Python 3.11+, FastAPI, Pydantic, httpx, pandas |
| **Frontend** | Next.js 15, React 19, TypeScript, Tailwind CSS 4, Recharts |
| **Database** | MongoDB Atlas (time-series collections) |
| **Auth** | Supabase (OAuth, session management, user profiles) |
| **LLM — Fast chat** | K2 Think V2 / Lava gateway |
| **LLM — Deep analysis** | K2 Think v2 by MBZUAI |
| **Data sources** | ComEd 5-minute pricing API, GridStatus.io (PJM fuel mix) |
| **Messaging** | Slack (Events API + Socket Mode) |

---

## Key Decisions

**K2 Think v2 is the brain, not a wrapper around an API call.** The energy analysis is powered by [K2 Think v2](https://huggingface.co/MBZUAI-IFM/K2-Think-v2), a deep-reasoning model built by MBZUAI specifically for scientific and quantitative domains. When WattsUp needs to analyze your bill, explain a pricing anomaly, or give a recommendation grounded in real grid data, it routes to K2 Think v2 for multi-step reasoning — not a generic chat completion. The model receives full historical context (up to 36 polling intervals), live ComEd pricing, fuel mix breakdowns, and your personal usage stats, then reasons through them before answering. This is what separates a real energy advisor from a chatbot that parrots averages.

**Two-tier LLM routing.** Quick questions ("what's the price right now?") go through a fast flash-tier model for instant responses. Complex analysis (bill breakdowns, historical trend explanations, proactive alerts) gets routed to K2 Think v2. This keeps the app snappy for simple queries while still delivering depth when it counts.

**Edge-triggered alerts, not spam.** Alerts fire only on state transitions (price dropping *into* a target band, z-score crossing a threshold) with configurable cooldowns. You get one notification when it matters, not a flood.

**Multi-step agent with tools.** The chat agent does not just call an LLM. It plans tool calls — querying MongoDB for your history, pulling a live grid snapshot, checking your stats — then grounds its answer in real data. The LLM never hallucinates a price because it always has the actual numbers in front of it.

**MongoDB time-series for everything.** Every five-minute poll writes a document with price, fuel mix, eco-score, z-score, and LLM analysis. The dashboard and chat agent both read from the same source of truth.

---

## How the Metrics Work

The dashboard numbers are not arbitrary. Here is what each one means and why we chose it.

### Eco-Efficiency Score

```
eco_score = (renewable_pct / price) * demand
```

This single number captures the three things that matter at any given moment: how clean the grid is (renewable percentage), how cheap power is (ComEd 5-minute price in cents/kWh), and how much load the region is carrying (demand in MW). A high score means the grid is running on a lot of renewables, electricity is cheap, and demand is significant — the ideal time to use power. We divide by price so that cheap + green windows score highest. Demand is multiplied in because a green grid under real load is more meaningful than a green grid at 3 AM when nobody is using anything. A floor of 0.01 cents prevents division by zero when prices occasionally go negative or hit zero.

### Z-Score (Statistical Anomaly Detection)

```
z = (current_score - mean) / std_dev
```

Standard z-score over the user's recent polling history (sample standard deviation, minimum two prior data points). This tells you how unusual the current eco-efficiency score is compared to your recent baseline. A z-score of +2 means the grid is unusually green and cheap right now — that is when we fire an alert. A z-score of -2 means conditions are unusually bad. We use this instead of fixed thresholds because "good" and "bad" shift with seasons, time of day, and market conditions. What counts as a great price in July is different from January. The z-score adapts automatically.

### Green Streak

A streak counts consecutive polls where your eco-efficiency score is above the **rolling median** of all your prior scores. We use the median (not the mean) because energy price data is heavily skewed — a few extreme spikes would drag a mean up and make streaks nearly impossible to maintain. The median gives a fair baseline that represents "normal" conditions for you specifically. The streak resets to zero the moment a poll falls at or below the median. **Streak calendar days** counts distinct UTC dates within the current run, which is what the dashboard shows as leaf count on the plant visual.

### Alert Rules

- **Z-score alerts** fire when `|z| >= 2` (configurable via `ZSCORE_SIGMA`). A cooldown timer (`ALERT_COOLDOWN_SECONDS`, default 15 min) prevents repeated pushes for the same direction — you get one "grid is great right now" alert, not one every five minutes while conditions stay good.
- **Ideal price alerts** are edge-triggered: they fire once when the ComEd price drops *into* your target band (set via `IDEAL_PRICE_CENTS_MAX`) from above, then stay quiet until the price leaves and re-enters the band. This prevents spam during sustained low-price periods.

---

## Project Structure

```
wattsup/
├── .env.example                    # All environment variables with docs
├── pyproject.toml                  # Python package config + CLI entry points
│
├── src/wattsup/                    # Python backend
│   ├── config.py                   # Pydantic settings (loads .env)
│   ├── models.py                   # Data models
│   ├── db.py                       # MongoDB queries
│   ├── quant.py                    # Eco-score and z-score math
│   ├── streaks.py                  # Green streak gamification
│   ├── orchestrator.py             # Main polling loop (ComEd → Grid → score → LLM → Mongo)
│   ├── chat_agent.py               # Multi-step tool-using chat agent
│   ├── server.py                   # FastAPI HTTP server
│   ├── worker.py                   # Background polling worker
│   ├── slack_agent_bridge.py       # Slack ↔ agent bridge
│   ├── slack_socket.py             # Slack Socket Mode handler
│   ├── plain_text.py               # Human-readable output formatting
│   └── tools/
│       ├── comed.py                # ComEd 5-minute price tool
│       ├── gridstatus_tool.py      # PJM fuel mix tool
│       ├── llm_gateway.py          # K2 Think v2 + flash model routing
│       └── push_notification.py    # Slack / Telegram / WhatsApp alerts
│
├── web/                            # Next.js frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx            # Landing page
│   │   │   ├── auth/               # Sign in / sign up / OAuth callback
│   │   │   ├── dashboard/          # Main dashboard (protected)
│   │   │   ├── profile/            # User profile
│   │   │   ├── friends/            # Social features & leaderboards
│   │   │   └── api/
│   │   │       ├── energy/         # Snapshot, latest, logs, stats endpoints
│   │   │       ├── chat/           # K2-powered chat
│   │   │       ├── bill-analyze/   # PDF/text bill analysis via K2
│   │   │       └── gamification/   # Streaks and achievements
│   │   ├── components/
│   │   │   ├── Dashboard.tsx       # Main dashboard layout
│   │   │   ├── AskWattsUp.tsx      # Chat interface
│   │   │   ├── BillUploadPanel.tsx # Bill upload and analysis
│   │   │   ├── EfficiencyDial.tsx  # Eco-score gauge
│   │   │   ├── GridHeartbeat.tsx   # Live grid status indicator
│   │   │   └── HeroMetrics.tsx     # Impact counters (CO2, $, streaks)
│   │   ├── lib/
│   │   │   ├── energy-service.ts   # Main data fetching
│   │   │   ├── mongodb.ts          # Database client
│   │   │   └── supabase/           # Auth helpers (server + client)
│   │   └── types/
│   │       └── energy.ts           # TypeScript type definitions
│   └── public/                     # Static assets
│
└── scripts/
    └── seed_demo_history.py        # Seed MongoDB with demo data
```

---

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- A MongoDB Atlas cluster ([free tier works](https://www.mongodb.com/atlas))
- API keys: GridStatus.io, K2V2/Lava, K2 Think v2
- Supabase project (for auth)

### 1. Clone and configure

```bash
git clone <repo-url>
cd wattsup
cp .env.example .env
```

Open `.env` and fill in at minimum:

```
MONGODB_URI=mongodb+srv://...
MONGODB_DB=wattsup
GRIDSTATUS_API_KEY=your_key
K2V2_BASE_URL=https://api.lava.so
K2V2_API_KEY=your_key
K2_API_KEY=your_key
K2_ENDPOINT=https://api.k2think.ai/v1/chat/completions
K2_MODEL=MBZUAI-IFM/K2-Think-v2
```

For the web app, also create `web/.env.local` (see `web/.env.local.example`):

```
MONGODB_URI=mongodb+srv://...
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your_anon_key
K2_API_KEY=your_key
K2_ENDPOINT=https://api.k2think.ai/v1/chat/completions
K2_MODEL=MBZUAI-IFM/K2-Think-v2
```

### 2. Install and run the backend

```bash
pip install -e .

# Start the API server
wattsup-serve

# In a second terminal, start the background poller
wattsup-worker --user-id default
```

The server runs at `http://127.0.0.1:8000`. Health check: `GET /health`.

### 3. Install and run the frontend

```bash
cd web
npm install
npm run dev
```

The app runs at `http://localhost:3000`. Sign up, log in, and the dashboard will start showing data as soon as the worker has polled a few times.

### 4. Seed demo data (optional)

If you want to see the dashboard populated immediately without waiting for real polls:

```bash
python scripts/seed_demo_history.py --user-id default --days 10
```

### 5. Messaging integrations (optional)

**Slack** — Set `SLACK_BOT_TOKEN` and either `SLACK_APP_TOKEN` (Socket Mode, no public URL needed) or `SLACK_SIGNING_SECRET` (Events API with a public URL pointing to `/webhooks/slack`). See `.env.example` for details.

**Telegram** — Set `TELEGRAM_BOT_TOKEN` and call `setWebhook` pointing to `/webhooks/telegram`.

**Proactive alerts** — Set `SLACK_WEBHOOK_URL` and/or `TELEGRAM_CHAT_ID` to receive push notifications when prices drop or the grid goes unusually green.

### Thank You!
