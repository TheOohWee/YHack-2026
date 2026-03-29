#!/usr/bin/env python3
"""
Insert ``streak_active_days`` so the recomputed Mongo ``streaks`` doc shows ~N day streak
without waiting for Slack. Also optional older run so ``longest_streak`` can exceed current.

Default: only the last **6** UTC days get ``streak_active_days`` rows (so current streak is 6 **if**
those days are not already extended by qualifying ``energy_logs`` on earlier days).

Use ``--history-run`` / ``--gap-days`` only if you understand that real poll data can still
fill “gap” days with passive wins and merge runs (same reason a Slack opt-in can jump 0 → 9).

Run from repo root:

  .venv/bin/python scripts/seed_streak_mongodb.py
  .venv/bin/python scripts/seed_streak_mongodb.py --user-id test-user --current-days 6 --display-current 6 --display-longest 8

Requires MONGODB_URI (from .env).
"""

from __future__ import annotations

import argparse
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))

from pymongo import ASCENDING, MongoClient  # noqa: E402

from wattsup.config import Settings  # noqa: E402
from wattsup.streaks import recompute_green_streak_from_history  # noqa: E402

_COLL = "streak_active_days"


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed streak_active_days + recompute streaks")
    parser.add_argument(
        "--user-id",
        default="",
        help="Mongo user_id (default: WATTSUP_DEFAULT_USER_ID / test-user)",
    )
    parser.add_argument(
        "--current-days",
        type=int,
        default=6,
        help="Consecutive UTC days ending today with an active win (default 6)",
    )
    parser.add_argument(
        "--history-run",
        type=int,
        default=0,
        help="Older consecutive active days to insert (default 0; polls may still extend longest)",
    )
    parser.add_argument(
        "--gap-days",
        type=int,
        default=0,
        help="Offset between current block and history block (default 0; only if --history-run > 0)",
    )
    parser.add_argument(
        "--replace-user",
        action="store_true",
        help="Remove existing streak_active_days for this user before seeding",
    )
    parser.add_argument(
        "--display-current",
        type=int,
        default=None,
        metavar="N",
        help=(
            "Set ``demo_streak_current`` on ``streaks`` (dashboard prefers this; survives poll recompute)."
        ),
    )
    parser.add_argument(
        "--display-longest",
        type=int,
        default=None,
        metavar="N",
        help="Set ``demo_streak_longest`` (default: max(recomputed longest, display-current)).",
    )
    parser.add_argument(
        "--clear-demo-display",
        action="store_true",
        help="Remove demo_streak_current / demo_streak_longest so the UI uses recomputed values.",
    )
    args = parser.parse_args()

    settings = Settings()
    uid = (args.user_id or settings.wattsup_default_user_id or "test-user").strip()
    if args.current_days < 1:
        raise SystemExit("--current-days must be >= 1")

    client = MongoClient(settings.mongodb_uri)
    db = client[settings.mongodb_db]
    coll = db[_COLL]
    coll.create_index([("user_id", ASCENDING), ("day_key", ASCENDING)], unique=True)

    if args.replace_user:
        coll.delete_many({"user_id": uid})

    if args.clear_demo_display:
        db["streaks"].update_one(
            {"user_id": uid},
            {
                "$unset": {
                    "demo_streak_current": "",
                    "demo_streak_longest": "",
                    "demo_streak_agent_bump_day": "",
                }
            },
        )
        print(f"Cleared demo_streak_* for user_id={uid!r}")

    today = datetime.now(timezone.utc).date()
    now = datetime.now(timezone.utc)

    # Recent block: today .. today-(current_days-1)
    offsets_current = list(range(args.current_days))

    # Older block: separated by gap so trailing count = current_days only.
    oldest_current_off = args.current_days - 1
    last_gap_off = oldest_current_off + args.gap_days
    youngest_hist_off = last_gap_off + 1
    offsets_history = []
    if args.history_run > 0:
        offsets_history = list(
            range(youngest_hist_off, youngest_hist_off + args.history_run)
        )

    all_offsets = sorted(set(offsets_current + offsets_history))
    for off in all_offsets:
        d = today - timedelta(days=off)
        day_key = d.isoformat()
        coll.update_one(
            {"user_id": uid, "day_key": day_key},
            {
                "$setOnInsert": {
                    "user_id": uid,
                    "day_key": day_key,
                    "source": "seed_streak_mongodb",
                    "created_at": now,
                }
            },
            upsert=True,
        )

    doc = recompute_green_streak_from_history(settings, uid)
    pinned: dict = {}
    if args.display_current is not None:
        cur = max(0, int(args.display_current))
        lng = (
            int(args.display_longest)
            if args.display_longest is not None
            else max(cur, int(doc.get("longest_streak", 0)) if doc else cur)
        )
        lng = max(lng, cur)
        pinned = {
            "demo_streak_current": cur,
            "demo_streak_longest": lng,
        }
        db["streaks"].update_one(
            {"user_id": uid},
            {"$set": {**pinned, "updated_at": now}},
            upsert=True,
        )

    print(f"user_id={uid!r}")
    print(f"Inserted active day offsets: current {offsets_current!r}, history {offsets_history!r}")
    if doc:
        print(
            f"streaks (recomputed) → current={doc.get('current_streak')}, "
            f"longest={doc.get('longest_streak')}, "
            f"calendar_days={doc.get('streak_calendar_days')}"
        )
    else:
        print("recompute returned None (unexpected)")
    if pinned:
        print(f"streaks (demo display; UI prefers these) → {pinned}")


if __name__ == "__main__":
    main()
