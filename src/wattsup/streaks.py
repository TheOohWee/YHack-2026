"""
Clean Energy streaks: Mongo `streaks` + `streak_active_days`.

A streak **day** is earned when any of the following hold:

1. **Active win** — User opted in via agent channel (Slack/Telegram phrases, slash-style commands,
   or explicit "yes, shift my load"). Stored in `streak_active_days` for that UTC calendar day.

2. **Passive win (clean day)** — At least one poll that day overlaps a **dirty-grid price window**
   (ComEd price z-score vs prior polls strictly below ``STREAK_DIRTY_GRID_PRICE_Z``, default -2.0),
   and during such a poll the user's ``eco_efficiency_score`` is at or below their rolling median of
   prior scores (held load in check during cheap / high-fossil windows).

3. **Quiet-grid green** — No poll in that UTC day is in a dirty window, but at least one poll
   beats the user's rolling median eco score (same spirit as the legacy green-poll streak).

Trailing streak counts consecutive UTC calendar days, moving backward from today, where the day is
a win. A day with no polls and no active credit neither extends nor breaks the count (skipped).
"""

from __future__ import annotations

import logging
import statistics
from datetime import date, datetime, timedelta, timezone
from typing import Any

import httpx
from pymongo import ASCENDING, MongoClient

from wattsup.config import Settings
from wattsup.quant import z_score

_log = logging.getLogger(__name__)

_MAX_PRIOR_ROWS = 4096
_STREAK_ACTIVE_COLL = "streak_active_days"


def _db(settings: Settings):
    client = MongoClient(settings.mongodb_uri)
    return client[settings.mongodb_db]


def _row_price(row: dict[str, Any]) -> float | None:
    pd = row.get("price_data") or {}
    v = pd.get("current_price") if isinstance(pd, dict) else None
    if isinstance(v, (int, float)) and not isinstance(v, bool):
        return float(v)
    return None


def _row_eco(row: dict[str, Any]) -> float | None:
    v = row.get("eco_efficiency_score")
    if isinstance(v, (int, float)) and not isinstance(v, bool):
        return float(v)
    return None


def _row_ts(row: dict[str, Any]) -> datetime | None:
    ts = row.get("timestamp")
    if isinstance(ts, datetime):
        return ts.astimezone(timezone.utc)
    return None


def _load_chronological_rows(settings: Settings, user_id: str) -> list[dict[str, Any]]:
    logs = _db(settings)["energy_logs"]
    cursor = (
        logs.find(
            {
                "user_id": user_id,
                "eco_efficiency_score": {"$exists": True},
            }
        )
        .sort("timestamp", ASCENDING)
        .limit(_MAX_PRIOR_ROWS)
    )
    return list(cursor)


def _load_active_day_keys(settings: Settings, user_id: str) -> set[str]:
    coll = _db(settings)[_STREAK_ACTIVE_COLL]
    out: set[str] = set()
    for row in coll.find({"user_id": user_id}, {"day_key": 1}):
        dk = row.get("day_key")
        if isinstance(dk, str) and dk:
            out.add(dk)
    return out


def _parse_day_key(dk: str) -> date | None:
    try:
        y, m, d = (int(x) for x in dk.split("-", 2))
        return date(y, m, d)
    except (TypeError, ValueError):
        return None


def record_active_streak_win(
    settings: Settings,
    user_id: str,
    *,
    source: str = "agent_opt_in",
    when: datetime | None = None,
) -> bool:
    """
    Credit today's UTC date as an active streak win (idempotent per user+day).

    Returns True if this call **newly inserted** today's row (first agent opt-in of that UTC day).
    """
    ts = when or datetime.now(timezone.utc)
    day_key = ts.date().isoformat()
    coll = _db(settings)[_STREAK_ACTIVE_COLL]
    coll.create_index([("user_id", ASCENDING), ("day_key", ASCENDING)], unique=True)
    res = coll.update_one(
        {"user_id": user_id, "day_key": day_key},
        {
            "$setOnInsert": {
                "user_id": user_id,
                "day_key": day_key,
                "source": source,
                "created_at": ts,
            }
        },
        upsert=True,
    )
    return res.upserted_id is not None


def maybe_bump_demo_streak_on_agent_opt_in(settings: Settings, user_id: str) -> None:
    """
    If the dashboard uses ``demo_streak_*`` overlay, increment displayed day streak by **1**
    when the user successfully triggers an agent opt-in (e.g. Slack optimize phrase), **at most
    once per UTC day** — even if today's row in ``streak_active_days`` already existed from seed.

    Uses ``demo_streak_agent_bump_day`` (YYYY-MM-DD UTC) so repeated messages the same day do
    not stack.
    """
    db = _db(settings)
    doc = db["streaks"].find_one({"user_id": user_id})
    if not doc:
        return
    raw = doc.get("demo_streak_current")
    if raw is None or (not isinstance(raw, (int, float))) or isinstance(raw, bool):
        return
    today_k = datetime.now(timezone.utc).date().isoformat()
    if doc.get("demo_streak_agent_bump_day") == today_k:
        return
    cur = int(raw)
    lng_raw = doc.get("demo_streak_longest")
    lng = int(lng_raw) if isinstance(lng_raw, (int, float)) and not isinstance(lng_raw, bool) else cur
    new_cur = cur + 1
    new_lng = max(lng, new_cur)
    now = datetime.now(timezone.utc)
    db["streaks"].update_one(
        {"user_id": user_id},
        {
            "$set": {
                "demo_streak_current": new_cur,
                "demo_streak_longest": new_lng,
                "demo_streak_agent_bump_day": today_k,
                "updated_at": now,
            }
        },
    )


class _PollSnap:
    __slots__ = ("day", "eco", "price_z", "median_eco_prior")

    def __init__(
        self,
        day: date,
        eco: float,
        price_z: float | None,
        median_eco_prior: float | None,
    ) -> None:
        self.day = day
        self.eco = eco
        self.price_z = price_z
        self.median_eco_prior = median_eco_prior


def _build_poll_snaps(rows: list[dict[str, Any]]) -> list[_PollSnap]:
    snaps: list[_PollSnap] = []
    prices_prior: list[float] = []
    ecos_prior: list[float] = []
    for row in rows:
        ts = _row_ts(row)
        eco = _row_eco(row)
        price = _row_price(row)
        if ts is None or eco is None or price is None:
            continue
        pz = z_score(prices_prior, price) if len(prices_prior) >= 2 else None
        med = float(statistics.median(ecos_prior)) if ecos_prior else None
        snaps.append(_PollSnap(ts.date(), eco, pz, med))
        prices_prior.append(price)
        ecos_prior.append(eco)
    return snaps


def _day_qualifies(
    snaps_today: list[_PollSnap],
    *,
    active_today: bool,
    dirty_z_max: float,
) -> bool | None:
    """
    True = win, False = loss (polls existed but failed), None = no data that day.
    """
    if active_today:
        return True
    if not snaps_today:
        return None
    dirty_threshold = dirty_z_max
    dirty_polls = [
        s
        for s in snaps_today
        if s.price_z is not None and s.price_z < dirty_threshold
    ]
    has_dirty = len(dirty_polls) > 0
    if has_dirty:
        for s in dirty_polls:
            if s.median_eco_prior is not None and s.eco <= s.median_eco_prior:
                return True
        return False
    for s in snaps_today:
        if s.median_eco_prior is not None and s.eco > s.median_eco_prior:
            return True
    return False


def _qualification_map(
    snaps: list[_PollSnap],
    active_keys: set[str],
    *,
    day_start: date,
    day_end: date,
    dirty_z_max: float,
) -> dict[date, bool | None]:
    by_day: dict[date, list[_PollSnap]] = {}
    for s in snaps:
        if s.day < day_start or s.day > day_end:
            continue
        by_day.setdefault(s.day, []).append(s)
    out: dict[date, bool | None] = {}
    d = day_start
    while d <= day_end:
        dk = d.isoformat()
        q = _day_qualifies(
            by_day.get(d, []),
            active_today=dk in active_keys,
            dirty_z_max=dirty_z_max,
        )
        out[d] = q
        d += timedelta(days=1)
    return out


def _trailing_streak_days(qual: dict[date, bool | None], today: date) -> int:
    """
    Strict consecutive UTC days: True extends; False ends; None ends.

    If **today** has no data yet (still polling / no opt-in), start from yesterday so the
    dashboard does not flash 0 on an in-progress calendar day.
    """
    d = today
    if qual.get(today) is None:
        d = today - timedelta(days=1)
    n = 0
    while True:
        q = qual.get(d)
        if q is True:
            n += 1
            d -= timedelta(days=1)
            continue
        break
    return n


def _longest_streak_days(qual: dict[date, bool | None]) -> int:
    dates = sorted(qual.keys())
    best = run = 0
    for d in dates:
        if qual.get(d) is True:
            run += 1
            best = max(best, run)
        else:
            run = 0
    return best


def _maybe_post_streak_celebration(
    settings: Settings,
    *,
    previous: int,
    current: int,
) -> None:
    if current <= previous or not settings.slack_webhook_url:
        return
    noun = "day" if current == 1 else "days"
    text = (
        f"I noticed you kept your usage in check during a dirty-grid window — "
        f"your Clean Energy Streak is now {current} {noun}. "
        f"Your Eco-Tree just leveled up; open the WattsUp dashboard to watch it bloom."
    )
    try:
        with httpx.Client(timeout=settings.http_timeout_seconds) as client:
            r = client.post(
                settings.slack_webhook_url,
                json={"text": text},
            )
            r.raise_for_status()
    except httpx.HTTPError as e:
        _log.warning("streak celebration slack webhook failed: %s", e)


def _compute_streak_payload(
    settings: Settings,
    rows: list[dict[str, Any]],
    active_keys: set[str],
) -> dict[str, Any] | None:
    if not rows and not active_keys:
        return None
    dirty_z = settings.streak_dirty_grid_price_z
    snaps = _build_poll_snaps(rows)
    today = datetime.now(timezone.utc).date()
    starts: list[date] = [today]
    for s in snaps:
        starts.append(s.day)
    for dk in active_keys:
        parsed = _parse_day_key(dk)
        if parsed is not None:
            starts.append(parsed)
    day_start = min(starts) if starts else today
    qual = _qualification_map(
        snaps, active_keys, day_start=day_start, day_end=today, dirty_z_max=dirty_z
    )
    trailing = _trailing_streak_days(qual, today)
    longest = _longest_streak_days(qual)

    last_green: bool | None = qual.get(today)
    if last_green is None:
        last_green = None
    elif last_green is True:
        last_green = True
    else:
        last_green = False

    last_med: float | None = None
    last_eco: float | None = None
    if snaps:
        s = snaps[-1]
        last_med = s.median_eco_prior
        last_eco = s.eco

    return {
        "current_streak": trailing,
        "longest_streak": longest,
        "last_poll_was_green": last_green,
        "rolling_median_at_poll": last_med,
        "last_eco_score": last_eco,
        "streak_calendar_days": trailing,
    }


def update_green_streak_for_user(settings: Settings, user_id: str) -> dict[str, Any]:
    """
    Recompute streak from ``energy_logs`` + ``streak_active_days`` and upsert ``streaks``.

    Posts a Slack webhook "agentic praise" when ``current_streak`` strictly increases.
    """
    db = _db(settings)
    streaks = db["streaks"]
    prev_doc = streaks.find_one({"user_id": user_id})
    prev_cur = int(prev_doc.get("current_streak", 0)) if prev_doc else 0

    rows = _load_chronological_rows(settings, user_id)
    active_keys = _load_active_day_keys(settings, user_id)
    payload = _compute_streak_payload(settings, rows, active_keys)
    if not payload:
        _log.debug("streaks: no scores for user_id=%s", user_id)
        return {"skipped": True, "reason": "no_scores"}

    now = datetime.now(timezone.utc)
    doc: dict[str, Any] = {
        "user_id": user_id,
        "updated_at": now,
        **payload,
    }
    streaks.create_index("user_id", unique=True)
    streaks.update_one({"user_id": user_id}, {"$set": doc}, upsert=True)

    new_cur = int(payload["current_streak"])
    if new_cur > prev_cur:
        _maybe_post_streak_celebration(settings, previous=prev_cur, current=new_cur)

    return doc


def recompute_green_streak_from_history(
    settings: Settings, user_id: str
) -> dict[str, Any] | None:
    """Replay history and upsert ``streaks`` (no celebration webhook)."""
    db = _db(settings)
    streaks = db["streaks"]
    rows = _load_chronological_rows(settings, user_id)
    active_keys = _load_active_day_keys(settings, user_id)
    payload = _compute_streak_payload(settings, rows, active_keys)
    if not payload:
        _log.debug("streaks recompute: no scores for user_id=%s", user_id)
        return None

    now = datetime.now(timezone.utc)
    doc: dict[str, Any] = {
        "user_id": user_id,
        "updated_at": now,
        **payload,
    }
    streaks.create_index("user_id", unique=True)
    streaks.update_one({"user_id": user_id}, {"$set": doc}, upsert=True)
    return doc
