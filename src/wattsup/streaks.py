"""
Clean-energy streaks: Mongo `streaks` collection.

A poll **counts toward the streak** when any of these hold:

- **Active win**: user took an explicit action (`action_taken`, e.g. confirmed a push).
- **Eco win**: eco-efficiency score beats the rolling median of all prior scores.
- **Passive clean day**: during grid stress — coal share z-score ≥ ``STREAK_GRID_STRESS_SIGMA``, or
  eco z-score ≤ ``-ZSCORE_SIGMA`` — the score did not collapse vs the prior poll (within
  ``STREAK_HOLD_TOLERANCE`` on the eco-efficiency scale).

``current_streak`` / ``longest_streak`` / ``streak_calendar_days`` are **UTC calendar days**.
A day counts as a win if **a strict majority** of that day's polls were wins, **or** the
day includes an explicit Slack opt-in row (``slack_active_streak_opt_in`` / optimize-help
/ WattWise synthetic insert).
"""

from __future__ import annotations

import logging
import statistics
from collections import defaultdict
from datetime import date, datetime, timezone
from typing import Any

from pymongo import ASCENDING, MongoClient

from wattsup.config import Settings
from wattsup.db import fetch_latest_energy_row, get_collection
from wattsup.streak_notify import notify_streak_milestone_grew

_log = logging.getLogger(__name__)

_MAX_PRIOR_SCORES = 2048


def _db(settings: Settings):
    client = MongoClient(settings.mongodb_uri)
    return client[settings.mongodb_db]


def _load_chronological_entries(
    settings: Settings, user_id: str
) -> list[tuple[datetime, float, bool, float | None, float | None, bool]]:
    """
    (timestamp, eco_score, action_taken, grid_stress_z, eco_z_score,
    explicit_slack_streak_opt_in) oldest → newest.
    """
    logs = _db(settings)["energy_logs"]
    cursor = (
        logs.find({"user_id": user_id, "eco_efficiency_score": {"$exists": True}})
        .sort("timestamp", ASCENDING)
        .limit(_MAX_PRIOR_SCORES)
    )
    out: list[tuple[datetime, float, bool, float | None, float | None, bool]] = []
    for row in cursor:
        v = row.get("eco_efficiency_score")
        if not isinstance(v, (int, float)) or isinstance(v, bool):
            continue
        ts = row.get("timestamp")
        if not isinstance(ts, datetime):
            continue
        at = row.get("action_taken")
        active = bool(at) if at is not None else False
        gz_raw = row.get("grid_stress_z")
        grid_z = float(gz_raw) if isinstance(gz_raw, (int, float)) else None
        ez_raw = row.get("z_score")
        eco_z = float(ez_raw) if isinstance(ez_raw, (int, float)) else None
        slack_x = bool(
            row.get("slack_active_streak_opt_in")
            or row.get("slack_wattwise_opt_in")
            or row.get("slack_optimize_help_opt_in")
        )
        out.append(
            (
                ts.astimezone(timezone.utc),
                float(v),
                active,
                grid_z,
                eco_z,
                slack_x,
            )
        )
    return out


def _day_won_from_poll_wins(
    poll_wins: list[tuple[datetime, bool]],
    explicit_day_credit: set[date],
) -> list[tuple[date, bool]]:
    """One row per UTC day: majority of polls won, or explicit Slack opt-in that day."""
    by_day: dict[date, list[bool]] = defaultdict(list)
    for ts, win in poll_wins:
        by_day[ts.date()].append(win)
    return sorted(
        (
            (
                d,
                (sum(1 for w in wins if w) * 2 > len(wins)) or (d in explicit_day_credit),
            )
            for d, wins in by_day.items()
        ),
        key=lambda x: x[0],
    )


def _trailing_consecutive_win_days(day_seq: list[tuple[date, bool]]) -> int:
    """Win days at the end of history, calendar-adjacent only (gaps break the run)."""
    if not day_seq or not day_seq[-1][1]:
        return 0
    streak = 1
    i = len(day_seq) - 1
    while i > 0:
        d_cur, _ = day_seq[i]
        d_prev, w_prev = day_seq[i - 1]
        if not w_prev:
            break
        if (d_cur - d_prev).days == 1:
            streak += 1
            i -= 1
        else:
            break
    return streak


def _max_consecutive_win_days(day_seq: list[tuple[date, bool]]) -> int:
    """Longest run of calendar-consecutive win days anywhere in history."""
    best = 0
    run = 0
    prev_d: date | None = None
    for d, w in day_seq:
        if not w:
            run = 0
            prev_d = d
            continue
        if run == 0 or prev_d is None or (d - prev_d).days != 1:
            run = 1
        else:
            run += 1
        prev_d = d
        best = max(best, run)
    return best


def _compute_streak_payload(
    entries: list[tuple[datetime, float, bool, float | None, float | None, bool]],
    settings: Settings,
) -> dict[str, Any] | None:
    if not entries:
        return None

    vals = [e[1] for e in entries]
    actions = [e[2] for e in entries]
    grid_zs = [e[3] for e in entries]
    eco_zs = [e[4] for e in entries]
    slack_opt = [e[5] for e in entries]
    times = [e[0] for e in entries]
    explicit_day_credit = {times[i].date() for i in range(len(entries)) if slack_opt[i]}

    poll_wins: list[tuple[datetime, bool]] = []
    last_med: float | None = None
    hold_tol = settings.streak_hold_tolerance
    grid_sig = settings.streak_grid_stress_sigma
    z_sig = settings.zscore_sigma

    for i, current in enumerate(vals):
        prior = vals[:i]
        if not prior:
            med = None
        else:
            med = float(statistics.median(prior))
        last_med = med

        eco_win = med is not None and current > med
        active_win = actions[i]
        explicit = slack_opt[i]
        passive = False
        if i > 0:
            prev_eco = vals[i - 1]
            held = current >= prev_eco - hold_tol
            grid_hot = grid_zs[i] is not None and grid_zs[i] >= grid_sig
            eco_crash = eco_zs[i] is not None and eco_zs[i] <= -z_sig
            passive = held and (grid_hot or eco_crash)

        is_win = active_win or eco_win or passive or explicit
        poll_wins.append((times[i], is_win))

    last_win = poll_wins[-1][1] if poll_wins else False
    day_seq = _day_won_from_poll_wins(poll_wins, explicit_day_credit)
    cur_st = _trailing_consecutive_win_days(day_seq)
    long_st = _max_consecutive_win_days(day_seq)
    calendar_days = cur_st

    return {
        "current_streak": cur_st,
        "longest_streak": long_st,
        "last_poll_was_green": last_win,
        "rolling_median_at_poll": last_med,
        "last_eco_score": vals[-1],
        "streak_calendar_days": calendar_days,
    }


def update_green_streak_for_user(settings: Settings, user_id: str) -> dict[str, Any]:
    """
    Call immediately after a new energy_logs document is inserted for ``user_id``.

    Streak values never decrease on update (replay can lag seeds); Slack optimize /
    WattWise synthetic rows also floor current at ``prev_current + 1``.
    """
    db = _db(settings)
    streaks = db["streaks"]
    prev = streaks.find_one({"user_id": user_id})
    prev_cur = int(prev.get("current_streak", 0) or 0) if prev else 0

    entries = _load_chronological_entries(settings, user_id)
    payload = _compute_streak_payload(entries, settings)
    if not payload:
        _log.debug("streaks: no scores for user_id=%s", user_id)
        return {"skipped": True, "reason": "no_scores"}

    comp_cur = int(payload["current_streak"])
    comp_long = int(payload["longest_streak"])
    prev_long = int(prev.get("longest_streak", 0) or 0) if prev else 0

    coll = get_collection(settings)
    latest_row = fetch_latest_energy_row(coll, user_id) or {}
    slack_bump = bool(
        latest_row.get("slack_active_streak_opt_in")
        or latest_row.get("slack_wattwise_opt_in")
        or latest_row.get("slack_optimize_help_opt_in")
    )

    # Replay-alone can under-count vs demo seeds; never drop current/longest on update.
    adj = max(comp_cur, prev_cur + 1) if slack_bump else comp_cur
    new_c = max(adj, prev_cur)
    new_long = max(comp_long, prev_long, new_c)
    payload["current_streak"] = new_c
    payload["streak_calendar_days"] = new_c
    payload["longest_streak"] = new_long

    now = datetime.now(timezone.utc)
    doc: dict[str, Any] = {
        "user_id": user_id,
        "updated_at": now,
        **payload,
    }
    streaks.create_index("user_id", unique=True)
    streaks.update_one({"user_id": user_id}, {"$set": doc}, upsert=True)
    try:
        notify_streak_milestone_grew(settings, user_id, prev_cur, new_cur)
    except Exception:
        _log.exception("streak celebration notify failed user_id=%s", user_id)

    return doc


def recompute_green_streak_from_history(
    settings: Settings, user_id: str, *, silent: bool = False
) -> dict[str, Any] | None:
    """
    Replay all ``energy_logs`` scores in chronological order and upsert ``streaks``.

    Use after bulk seeding so the dashboard shows a realistic streak without
    waiting for live polls. By default still fires celebration if streak grows —
    pass ``silent=True`` for bulk recompute.
    """
    db = _db(settings)
    streaks = db["streaks"]
    prev = streaks.find_one({"user_id": user_id})
    prev_cur = int(prev.get("current_streak", 0) or 0) if prev else 0

    entries = _load_chronological_entries(settings, user_id)
    payload = _compute_streak_payload(entries, settings)
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

    if not silent:
        try:
            notify_streak_milestone_grew(
                settings, user_id, prev_cur, int(payload["current_streak"])
            )
        except Exception:
            _log.exception("streak celebration notify failed user_id=%s", user_id)

    return doc
