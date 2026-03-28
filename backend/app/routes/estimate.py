"""Estimate route: compute energy, cost, and carbon from home profile."""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

from app.models import HomeProfile, BillData
from app.services.energy import estimate_energy

router = APIRouter()


class EstimateRequest(BaseModel):
    home: HomeProfile
    bill: Optional[BillData] = None


@router.post("/estimate")
async def estimate(req: EstimateRequest):
    result = estimate_energy(req.home, req.bill)
    return {"estimate": result.model_dump()}
