#!/usr/bin/env python3
"""
Upsert Mongo `streaks` with explicit current / longest values (demo / UX testing).

  .venv/bin/python scripts/seed_streak_mongo.py
  .venv/bin/python scripts/seed_streak_mongo.py --user-id test-user --current 6 --longest 8

Does not touch ``energy_logs``; for a streak consistent with history run
``seed_demo_history.py`` or live polls instead.
"""

from __future__ import annotations

import argparse
import sys
from datetime import datetime, timezone
from pathlib import Path

from pymongo import MongoClient

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))

from wattsup.config import Settings  # noqa: E402


def main() -> None:
    p = argparse.ArgumentParser(description="Seed streaks collection with fixed counts.")
    p.add_argument("--user-id", default="", help="Default: WATTSUP_DEFAULT_USER_ID or test-user")
    p.add_argument("--current", type=int, default=6, help="current_streak (default 6)")
    p.add_argument("--longest", type=int, default=8, help="longest_streak (default 8)")
    p.add_argument(
        "--calendar-days",
        type=int,
        default=0,
        help="streak_calendar_days (default: same as --current)",
    )
    args = p.parse_args()

    settings = Settings()
    if not settings.mongodb_uri:
        print("MONGODB_URI is not set.", file=sys.stderr)
        sys.exit(1)

    uid = (args.user_id or settings.wattsup_default_user_id or "test-user").strip()
    cal_days = args.calendar_days if args.calendar_days > 0 else max(1, args.current)

    now = datetime.now(timezone.utc)
    client = MongoClient(settings.mongodb_uri)
    db = client[settings.mongodb_db]
    db["streaks"].update_one(
        {"user_id": uid},
        {
            "$set": {
                "user_id": uid,
                "current_streak": max(0, args.current),
                "longest_streak": max(max(0, args.current), max(0, args.longest)),
                "streak_calendar_days": max(0, cal_days),
                "last_poll_was_green": True,
                "rolling_median_at_poll": 52.0,
                "last_eco_score": 58.0,
                "updated_at": now,
            }
        },
        upsert=True,
    )
    db["streaks"].create_index("user_id", unique=True)
    print(
        f"Upserted streaks for {uid!r}: current={args.current}, longest={args.longest}, "
        f"calendar_days={cal_days}"
    )


if __name__ == "__main__":
    main()
