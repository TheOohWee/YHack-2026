from __future__ import annotations

from typing import Any

from pymongo import ASCENDING, DESCENDING, MongoClient
from pymongo.collection import Collection
from pymongo.errors import CollectionInvalid

from wattsup.config import Settings
from wattsup.models import EnergyLogDocument


def get_collection(settings: Settings) -> Collection:
    client = MongoClient(settings.mongodb_uri)
    db = client[settings.mongodb_db]
    return db["energy_logs"]


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


def enrich_and_insert(
    collection: Collection,
    doc: EnergyLogDocument,
    extras: dict[str, Any],
) -> None:
    payload = doc.to_mongo()
    payload.update(extras)
    collection.insert_one(payload)
