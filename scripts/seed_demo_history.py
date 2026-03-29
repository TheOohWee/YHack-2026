#!/usr/bin/env python3
"""
One-time (or repeatable) MongoDB seed for a realistic dashboard demo.

- Inserts hourly energy_logs for the past N days (PJM-ish mix, ComEd-scale prices).
- Upserts user_stats with plausible savings totals.
- Recomputes ``streaks`` from seeded scores so the green-streak plant shows mock data.
- Does NOT call ComEd, GridStatus, or any poll tools — read path stays unchanged.

Run from repo root (uses src/wattsup on PYTHONPATH):

  .venv/bin/python scripts/seed_demo_history.py
  .venv/bin/python scripts/seed_demo_history.py --user-id demo-user --days 10 --replace

Requires MONGODB_URI in .env (same as wattsup).
"""

from __future__ import annotations

import argparse
import math
import random
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))

from pymongo import MongoClient  # noqa: E402

from wattsup.config import Settings  # noqa: E402
from wattsup.db import enrich_and_insert, get_collection  # noqa: E402
from wattsup.models import EnergyLogDocument, FuelMix, PriceData  # noqa: E402
from wattsup.quant import eco_efficiency_score, z_score  # noqa: E402
from wattsup.streaks import recompute_green_streak_from_history  # noqa: E402

# Reproducible demo
random.seed(20260329)


def _normalize_mix(
    nuclear: float,
    coal: float,
    natural_gas: float,
    wind: float,
    solar: float,
    battery_storage: float,
    imports: float,
    other: float,
) -> FuelMix:
    total = nuclear + coal + natural_gas + wind + solar + battery_storage + imports + other
    if total <= 0:
        return FuelMix()
    s = 100.0 / total
    return FuelMix(
        nuclear=nuclear * s,
        coal=coal * s,
        natural_gas=natural_gas * s,
        wind=wind * s,
        solar=solar * s,
        battery_storage=battery_storage * s,
        imports=imports * s,
        other=other * s,
    )


def synthetic_point(
    hour_index: int,
    *,
    hours_total: int,
) -> tuple[PriceData, FuelMix, float, float]:
    """hour_index 0 = oldest, hours_total-1 = newest."""
    # Diurnal cycle (0..2pi over 24h), slow drift over multi-day demo
    t = hour_index
    phase = ((t % 24) / 24.0) * 2 * math.pi
    drift = 0.15 * math.sin((t / max(hours_total, 1)) * 2 * math.pi)

    # Price cents/kWh — trough overnight, bump late afternoon
    base = 6.8 + 2.2 * math.sin(phase - 1.2) + drift * 3
    noise = random.uniform(-0.35, 0.35)
    current_price = float(max(3.5, min(16.0, base + noise)))
    avg_24h = current_price + random.uniform(-0.8, 0.8)

    solar = max(0.0, 2.0 + 7.5 * max(0, math.sin(phase - math.pi / 2)))
    wind = max(2.0, 10.0 + 6.0 * math.sin(phase * 0.35 + 0.5) + random.uniform(-2, 2))
    natural_gas = max(18.0, 38.0 - 0.12 * (solar + wind) + random.uniform(-3, 3))
    nuclear = max(22.0, 34.0 + random.uniform(-2, 2))
    coal = max(4.0, 12.0 + random.uniform(-2, 2))
    battery_storage = random.uniform(0.8, 2.5)
    imports = random.uniform(2.0, 5.5)
    other = max(0.5, 6.0 - battery_storage)

    fuel = _normalize_mix(
        nuclear, coal, natural_gas, wind, solar, battery_storage, imports, other
    )
    renewable_pct = min(
        100.0,
        fuel.wind + fuel.solar + fuel.battery_storage + random.uniform(-0.5, 0.5),
    )
    demand_mw = 47000 + 4000 * math.sin(phase * 0.5) + random.uniform(-1500, 1500)

    return (
        PriceData(current_price=current_price, avg_24h=float(avg_24h)),
        fuel,
        renewable_pct,
        float(max(30_000.0, min(70_000.0, demand_mw))),
    )


def main() -> None:
    p = argparse.ArgumentParser(description="Seed MongoDB with demo energy_logs history.")
    p.add_argument(
        "--user-id",
        default="",
        help="Mongo user_id (default: WATTSUP_DEFAULT_USER_ID or test-user from env)",
    )
    p.add_argument("--days", type=int, default=8, help="Days of hourly history (default 8)")
    p.add_argument(
        "--replace",
        action="store_true",
        help="Delete existing energy_logs for this user in the seeded time window, then insert",
    )
    p.add_argument(
        "--dry-run",
        action="store_true",
        help="Print counts only; do not write to Mongo",
    )
    args = p.parse_args()

    settings = Settings()
    if not settings.mongodb_uri:
        print("MONGODB_URI is not set. Configure .env at repo root.", file=sys.stderr)
        sys.exit(1)

    uid = (args.user_id or settings.wattsup_default_user_id or "test-user").strip()

    now = datetime.now(timezone.utc)
    hours = max(24, args.days * 24)
    start = now - timedelta(hours=hours)

    if args.dry_run:
        print(f"Dry run: would seed {hours} hourly docs for user_id={uid!r} from {start} to {now}")
        return

    coll = get_collection(settings)
    if args.replace:
        deleted = coll.delete_many(
            {"user_id": uid, "timestamp": {"$gte": start, "$lte": now}}
        ).deleted_count
        print(f"Removed {deleted} existing log(s) in window for {uid!r}")

    eco_history: list[float] = []
    inserted = 0

    demo_insight = (
        "1. Run the dishwasher after 9 p.m. when wind is often stronger — save ~$8/mo. "
        "2. Pre-cool for an hour on green afternoons instead of peak — save ~$5/mo. "
        "3. Shift laundry to weekend mornings when solar share tends to rise — save ~$6/mo."
    )

    for i in range(hours):
        ts = start + timedelta(hours=i)
        pd, fuel, renewable_pct, demand_mw = synthetic_point(i, hours_total=hours)
        eco = eco_efficiency_score(renewable_pct, pd.current_price, demand_mw)
        hist_tail = eco_history[-96:]
        z = z_score(hist_tail, eco) if len(hist_tail) >= 2 else None
        eco_history.append(eco)

        doc = EnergyLogDocument(
            user_id=uid,
            timestamp=ts,
            price_data=pd,
            fuel_mix=fuel,
            action_taken=False,
        )
        extras: dict[str, Any] = {
            "eco_efficiency_score": eco,
            "renewable_pct": renewable_pct,
            "local_demand_mw": demand_mw,
            "z_score": z,
            "gridstatus_ok": True,
            "llm_route": None,
            "total_dollars_saved": 42.5 + i * 0.02,
            "total_carbon_saved_kg": 18.2 + i * 0.01,
        }
        # Latest rows get a realistic LLM-style blurb for the dashboard insight cards
        if i >= hours - 3:
            extras["social_message"] = demo_insight
            extras["llm_analysis"] = demo_insight

        enrich_and_insert(coll, doc, extras)
        inserted += 1

    # user_stats for Hero metrics / chat context
    client = MongoClient(settings.mongodb_uri)
    db = client[settings.mongodb_db]
    db["user_stats"].update_one(
        {"user_id": uid},
        {
            "$set": {
                "user_id": uid,
                "total_dollars_saved": 127.40,
                "total_carbon_saved_kg": 54.8,
            }
        },
        upsert=True,
    )

    rec = recompute_green_streak_from_history(settings, uid)
    if rec:
        print(
            f"Recomputed streaks for user_id={uid!r}: "
            f"current={rec['current_streak']} longest={rec['longest_streak']}"
        )

    print(f"Inserted {inserted} energy_logs for user_id={uid!r}")
    print(f"Upserted user_stats for user_id={uid!r}")
    print("Done. Open the dashboard with the same user id to view the baseline.")


if __name__ == "__main__":
    main()
