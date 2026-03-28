"""Simulate route: what-if scenario modeling."""

import traceback
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from typing import Optional

from app.models import HomeProfile, BillData, SimulateRequest
from app.services.energy import estimate_energy
from app.services.recommender import get_recommendations

router = APIRouter()


@router.post("/simulate")
async def simulate(req: SimulateRequest):
  try:
    baseline = estimate_energy(req.home, req.bill)

    # Apply changes to home profile
    modified_data = req.home.model_dump()
    modified_data.update(req.changes)
    modified_home = HomeProfile(**modified_data)

    # Compute modified estimate
    modified = estimate_energy(modified_home, req.bill)

    # Get updated recommendations
    recs = await get_recommendations(modified_home, modified)

    # Compute deltas
    deltas = {
        "kwh_per_month": round(modified.kwh_per_month - baseline.kwh_per_month),
        "therms_per_month": round(modified.therms_per_month - baseline.therms_per_month),
        "total_monthly_cost": round(modified.total_monthly_cost - baseline.total_monthly_cost, 2),
        "carbon_kg_per_month": round(modified.carbon_kg_per_month - baseline.carbon_kg_per_month),
    }

    return {
        "baseline": baseline.model_dump(),
        "modified": modified.model_dump(),
        "deltas": deltas,
        "modified_home": modified_home.model_dump(),
        "recommendations": [r.model_dump() for r in recs],
    }
  except Exception as e:
    traceback.print_exc()
    return JSONResponse(status_code=500, content={"error": str(e)})
