"""Recommend route: generate top 3 personalized recommendations."""

import traceback
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, Any

from app.models import HomeProfile, BillData
from app.services.energy import estimate_energy
from app.services.recommender import get_recommendations

router = APIRouter()


class RecommendRequest(BaseModel):
    home: HomeProfile
    estimate: Optional[Any] = None
    bill: Optional[BillData] = None


@router.post("/recommend")
async def recommend(req: RecommendRequest):
    try:
        from app.models import EnergyEstimate

        est = None
        if req.estimate:
            est = EnergyEstimate(**req.estimate) if isinstance(req.estimate, dict) else req.estimate
        if est is None:
            est = estimate_energy(req.home, req.bill)

        recs = await get_recommendations(req.home, est)
        return {"recommendations": [r.model_dump() for r in recs]}
    except Exception as e:
        traceback.print_exc()
        return {"recommendations": [], "error": str(e)}
