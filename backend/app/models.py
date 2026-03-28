from pydantic import BaseModel
from typing import Optional


class HomeProfile(BaseModel):
    sqft: int = 1500
    bedrooms: int = 3
    bathrooms: int = 2
    year_built: int = 1990
    heating_type: str = "gas"          # gas, electric, heat_pump, oil, propane
    cooling_type: str = "central_ac"   # central_ac, window_ac, none
    water_heater: str = "gas"          # gas, electric, heat_pump, tankless
    insulation: str = "average"        # poor, average, good
    windows: str = "single"            # single, double, triple
    has_solar: bool = False
    has_pool: bool = False
    has_ev: bool = False
    num_occupants: int = 3
    zip_code: str = "90210"
    climate_zone: Optional[str] = None
    appliances: list[str] = []
    habits: Optional[str] = None


class BillData(BaseModel):
    monthly_cost: Optional[float] = None
    kwh_used: Optional[float] = None
    therms_used: Optional[float] = None
    billing_period: Optional[str] = None
    provider: Optional[str] = None
    rate_plan: Optional[str] = None


class EnergyEstimate(BaseModel):
    kwh_per_month: float
    therms_per_month: float
    electric_cost: float
    gas_cost: float
    total_monthly_cost: float
    carbon_kg_per_month: float
    carbon_trees_equivalent: float
    breakdown: dict  # category -> kwh


class Recommendation(BaseModel):
    rank: int
    title: str
    description: str
    estimated_annual_savings: float
    estimated_carbon_reduction_kg: float
    upfront_cost_range: str
    payback_years: float
    effort_level: str  # low, medium, high
    category: str      # heating, cooling, insulation, appliance, renewable, behavior


class SimulateRequest(BaseModel):
    home: HomeProfile
    bill: Optional[BillData] = None
    changes: dict  # field -> new_value


class ParseHomeRequest(BaseModel):
    text: str
    zip_code: Optional[str] = None


class ParseBillRequest(BaseModel):
    text: str
