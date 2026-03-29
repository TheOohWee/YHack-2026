from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from pymongo import ASCENDING, DESCENDING, MongoClient
from pymongo.collection import Collection
from pymongo.errors import CollectionInvalid

from wattsup.config import Settings
from wattsup.models import EnergyLogDocument, FuelMix


def get_collection(settings: Settings) -> Collection:
    client = MongoClient(settings.mongodb_uri)
    db = client[settings.mongodb_db]
    return db["energy_logs"]


def fetch_user_stats_totals(settings: Settings, user_id: str) -> dict[str, float]:
    """Snapshot user_stats for denormalizing onto each new energy_logs row."""
    client = MongoClient(settings.mongodb_uri)
    row = client[settings.mongodb_db]["user_stats"].find_one({"user_id": user_id})
    if not row:
        return {}
    out: dict[str, float] = {}
    v = row.get("total_dollars_saved")
    if isinstance(v, (int, float)):
        out["total_dollars_saved"] = float(v)
    c = row.get("total_carbon_saved_kg")
    if isinstance(c, (int, float)):
        out["total_carbon_saved_kg"] = float(c)
    else:
        c2 = row.get("total_carbon_saved")
        if isinstance(c2, (int, float)):
            out["total_carbon_saved_kg"] = float(c2)
    return out


def get_alert_state_collection(settings: Settings) -> Collection:
    client = MongoClient(settings.mongodb_uri)
    db = client[settings.mongodb_db]
    coll = db["alert_state"]
    coll.create_index("user_id", unique=True)
    return coll


def _get_alert_state(coll: Collection, user_id: str) -> dict[str, Any]:
    row = coll.find_one({"user_id": user_id})
    if row:
        return dict(row)
    return {
        "user_id": user_id,
        "ideal_armed": True,
        "last_zscore_notify_at": None,
        "last_zscore_sign": None,
    }


def ideal_price_should_notify(
    coll: Collection,
    user_id: str,
    current_price_cents: float,
    ideal_max_cents: float,
) -> tuple[bool, dict[str, Any]]:
    """
    Edge-trigger: notify when price crosses to/below ideal_max from above.
    ideal_armed True means we are 'above band' and ready to fire on dip.
    """
    st = _get_alert_state(coll, user_id)
    armed = bool(st.get("ideal_armed", True))
    below = current_price_cents <= ideal_max_cents
    fire = armed and below
    update: dict[str, Any] = {"user_id": user_id}
    if below:
        update["ideal_armed"] = False
    else:
        update["ideal_armed"] = True
    return fire, update


def zscore_cooldown_allows_notify(
    coll: Collection,
    user_id: str,
    z_sign: int,
    cooldown_seconds: int,
) -> tuple[bool, dict[str, Any]]:
    """Skip repeat z-score pushes within cooldown if same sign."""
    st = _get_alert_state(coll, user_id)
    now = datetime.now(timezone.utc)
    last_at = st.get("last_zscore_notify_at")
    last_sign = st.get("last_zscore_sign")
    if (
        last_at is not None
        and last_sign == z_sign
        and isinstance(last_at, datetime)
    ):
        delta = (now - last_at.astimezone(timezone.utc)).total_seconds()
        if delta < cooldown_seconds:
            return False, {}
    update = {
        "user_id": user_id,
        "last_zscore_notify_at": now,
        "last_zscore_sign": z_sign,
    }
    return True, update


def merge_alert_state_update(coll: Collection, user_id: str, fields: dict[str, Any]) -> None:
    if not fields:
        return
    payload = {k: v for k, v in fields.items() if k != "user_id"}
    coll.update_one({"user_id": user_id}, {"$set": payload}, upsert=True)


def fetch_latest_energy_row(
    collection: Collection, user_id: str
) -> dict[str, Any] | None:
    return collection.find_one({"user_id": user_id}, sort=[("timestamp", DESCENDING)])


def fetch_recent_energy_rows(
    collection: Collection, user_id: str, limit: int
) -> list[dict[str, Any]]:
    cur = (
        collection.find({"user_id": user_id})
        .sort("timestamp", DESCENDING)
        .limit(limit)
    )
    rows = list(cur)
    rows.reverse()
    return rows


def ensure_energy_logs_timeseries(collection: Collection) -> None:
    """Create time-series collection if missing (timestamp = timeField, no metaField)."""
    db = collection.database
    name = collection.name
    if name in db.list_collection_names():
        return
    try:
        db.create_collection(
            name,
            timeseries={"timeField": "timestamp", "granularity": "minutes"},
        )
    except CollectionInvalid:
        return
    collection.create_index([("user_id", ASCENDING), ("timestamp", DESCENDING)])


def fetch_recent_scores(
    collection: Collection, user_id: str, limit: int
) -> list[float]:
    cursor = (
        collection.find({"user_id": user_id, "eco_efficiency_score": {"$exists": True}})
        .sort("timestamp", DESCENDING)
        .limit(limit)
    )
    scores: list[float] = []
    for row in cursor:
        v = row.get("eco_efficiency_score")
        if isinstance(v, (int, float)):
            scores.append(float(v))
    return list(reversed(scores))


def fetch_latest_good_fuel_mix(settings: Settings, user_id: str) -> FuelMix | None:
    """
    Reuse a recent blend when GridStatus fails so we do not append an all-zero fuel_mix row
    (which makes charts drop to 0 after refresh/poll).
    """
    coll = get_collection(settings)
    cursor = (
        coll.find({"user_id": user_id, "fuel_mix": {"$exists": True, "$ne": None}})
        .sort("timestamp", DESCENDING)
        .limit(80)
    )
    for doc in cursor:
        raw = doc.get("fuel_mix")
        if not isinstance(raw, dict):
            continue
        try:
            mix = FuelMix.model_validate(raw)
        except Exception:
            continue
        total = (
            mix.wind
            + mix.solar
            + mix.nuclear
            + mix.coal
            + mix.natural_gas
        )
        if total < 0.05:
            continue
        return mix
    return None


def enrich_and_insert(
    collection: Collection,
    doc: EnergyLogDocument,
    extras: dict[str, Any],
) -> None:
    payload = doc.to_mongo()
    payload.update(extras)
    collection.insert_one(payload)
