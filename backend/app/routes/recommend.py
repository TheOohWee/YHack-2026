"""Recommend route: generate top 3 personalized recommendations."""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

from app.models import HomeProfile, EnergyEstimate, BillData
from app.services.energy import estimate_energy
from app.services.recommender import get_recommendations

router = APIRouter()


class RecommendRequest(BaseModel):
    home: HomeProfile
    estimate: Optional[EnergyEstimate] = None
    bill: Optional[BillData] = None


@router.post("/recommend")
async def recommend(req: RecommendRequest):
    est = req.estimate
    if est is None:
        est = estimate_energy(req.home, req.bill)

    recs = await get_recommendations(req.home, est)
    return {"recommendations": [r.model_dump() for r in recs]}
