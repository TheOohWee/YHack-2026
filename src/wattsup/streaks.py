"""
Green poll streaks: Mongo `streaks` collection.

Each poll where eco_efficiency_score is above the user's rolling median counts
toward the streak. ``streak_calendar_days`` is the number of distinct UTC
calendar days covered by the current trailing green run (for UI leaf count).
"""

from __future__ import annotations

import logging
import statistics
from datetime import datetime, timezone
from typing import Any

from pymongo import ASCENDING, MongoClient

from wattsup.config import Settings

_log = logging.getLogger(__name__)

_MAX_PRIOR_SCORES = 2048


def _db(settings: Settings):
    client = MongoClient(settings.mongodb_uri)
    return client[settings.mongodb_db]


def _load_chronological_scored(
    settings: Settings, user_id: str
) -> list[tuple[datetime, float]]:
    logs = _db(settings)["energy_logs"]
    cursor = (
        logs.find({"user_id": user_id, "eco_efficiency_score": {"$exists": True}})
        .sort("timestamp", ASCENDING)
        .limit(_MAX_PRIOR_SCORES)
    )
    out: list[tuple[datetime, float]] = []
    for row in cursor:
        v = row.get("eco_efficiency_score")
        if not isinstance(v, (int, float)) or isinstance(v, bool):
            continue
        ts = row.get("timestamp")
        if not isinstance(ts, datetime):
            continue
        out.append((ts.astimezone(timezone.utc), float(v)))
    return out


def _compute_streak_payload(
    chron: list[tuple[datetime, float]],
) -> dict[str, Any] | None:
    if not chron:
        return None
    vals = [s for _, s in chron]
    times = [t for t, _ in chron]
    cur_st = 0
    long_st = 0
    last_green = False
    last_med: float | None = None

    for i, current in enumerate(vals):
        prior = vals[:i]
        if not prior:
            is_green = False
            med = None
        else:
            med = float(statistics.median(prior))
            is_green = current > med
        if is_green:
            cur_st += 1
        else:
            cur_st = 0
        long_st = max(long_st, cur_st)
        last_green = is_green
        last_med = med

    calendar_days = 0
    if cur_st > 0:
        tail_times = times[-cur_st:]
        calendar_days = len({t.date() for t in tail_times})

    return {
        "current_streak": cur_st,
        "longest_streak": long_st,
        "last_poll_was_green": last_green,
        "rolling_median_at_poll": last_med,
        "last_eco_score": vals[-1],
        "streak_calendar_days": calendar_days,
    }


def update_green_streak_for_user(settings: Settings, user_id: str) -> dict[str, Any]:
    """
    Call immediately after a new energy_logs document is inserted for ``user_id``.

    Full replay from stored history so totals stay consistent with ``recompute``.
    """
    db = _db(settings)
    streaks = db["streaks"]
    chron = _load_chronological_scored(settings, user_id)
    payload = _compute_streak_payload(chron)
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
    return doc


def recompute_green_streak_from_history(settings: Settings, user_id: str) -> dict[str, Any] | None:
    """
    Replay all ``energy_logs`` scores in chronological order and upsert ``streaks``.

    Use after bulk seeding so the dashboard shows a realistic streak without
    waiting for live polls.
    """
    db = _db(settings)
    streaks = db["streaks"]
    chron = _load_chronological_scored(settings, user_id)
    payload = _compute_streak_payload(chron)
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
