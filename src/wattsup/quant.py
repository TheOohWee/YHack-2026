from __future__ import annotations

import math


def eco_efficiency_score(renewable_pct: float, price_cents: float, demand_mw: float) -> float:
    """(Renewable % / Price) * Local Demand — price floor avoids divide-by-zero."""
    safe_price = max(price_cents, 0.01)
    return (renewable_pct / safe_price) * demand_mw


def z_score(history: list[float], current: float) -> float | None:
    """Sample standard deviation; needs at least two prior points."""
    if len(history) < 2 or not math.isfinite(current):
        return None
    mu = sum(history) / len(history)
    var = sum((x - mu) ** 2 for x in history) / (len(history) - 1)
    sigma = math.sqrt(var)
    if sigma == 0.0:
        return None
    return (current - mu) / sigma
