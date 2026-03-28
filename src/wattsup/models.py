from datetime import datetime, timezone
from typing import Any

from pydantic import BaseModel, Field, field_validator


class PriceData(BaseModel):
    current_price: float
    avg_24h: float


class FuelMix(BaseModel):
    wind_pct: float = Field(ge=0.0, le=100.0)
    solar_pct: float = Field(ge=0.0, le=100.0)
    fossil_pct: float = Field(ge=0.0, le=100.0)
    nuclear_pct: float = Field(default=0.0, ge=0.0, le=100.0)
    hydro_pct: float = Field(default=0.0, ge=0.0, le=100.0)
    # Biomass, storage, geothermal, imports, synch cond, unmapped labels, etc.
    other_pct: float = Field(default=0.0, ge=0.0, le=100.0)


class EnergyLogDocument(BaseModel):
    """MongoDB payload: required fields per product schema."""

    user_id: str
    timestamp: datetime
    price_data: PriceData
    fuel_mix: FuelMix
    action_taken: bool

    @field_validator("timestamp")
    @classmethod
    def ensure_utc(cls, v: datetime) -> datetime:
        if v.tzinfo is None:
            return v.replace(tzinfo=timezone.utc)
        return v.astimezone(timezone.utc)

    def to_mongo(self) -> dict[str, Any]:
        d = self.model_dump()
        d["timestamp"] = self.timestamp
        return d


class PollContext(BaseModel):
    """Working context passed between tools (Agent Zero–friendly)."""

    user_id: str
    price_data: PriceData | None = None
    fuel_mix: FuelMix | None = None
    local_demand_mw: float | None = None
    renewable_pct: float | None = None
    eco_efficiency_score: float | None = None
    z_score: float | None = None
    notify: bool = False
    action_taken: bool = False
    llm_analysis: str | None = None
    hex_triggered: bool = False

