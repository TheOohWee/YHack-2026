"""AI-powered recommendation engine using Gemini for personalized advice."""

import json
import os
import google.generativeai as genai
from app.models import HomeProfile, EnergyEstimate, Recommendation

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

RECOMMEND_PROMPT = """You are a home energy efficiency expert. Based on this household profile and energy data, recommend the top 3 most impactful actions the homeowner can take to reduce their energy costs and carbon footprint.

HOUSEHOLD PROFILE:
{home_json}

ENERGY ESTIMATE:
{estimate_json}

For each recommendation, consider:
- How much money it will save annually (be specific, use the estimate data)
- How much carbon it will reduce (in kg CO2/year)
- The upfront cost range
- Payback period in years
- Effort level (low/medium/high)
- Category (heating/cooling/insulation/appliance/renewable/behavior)

Return ONLY valid JSON array of exactly 3 recommendations:
[
  {{
    "rank": 1,
    "title": "<short actionable title>",
    "description": "<2-3 sentence explanation of why this matters for THIS specific home and what the homeowner should do>",
    "estimated_annual_savings": <float dollars>,
    "estimated_carbon_reduction_kg": <float kg CO2/year>,
    "upfront_cost_range": "<e.g. $2,000 - $5,000>",
    "payback_years": <float>,
    "effort_level": "<low|medium|high>",
    "category": "<heating|cooling|insulation|appliance|renewable|behavior>"
  }}
]

Rank by combined impact: prioritize recommendations that save the most money AND carbon with reasonable payback periods. Be specific to this home — don't give generic advice."""


async def get_recommendations(
    home: HomeProfile, estimate: EnergyEstimate
) -> list[Recommendation]:
    if not GEMINI_API_KEY:
        return _fallback_recommendations(home, estimate)

    try:
        model = genai.GenerativeModel("gemini-2.0-flash")
        prompt = RECOMMEND_PROMPT.format(
            home_json=home.model_dump_json(indent=2),
            estimate_json=estimate.model_dump_json(indent=2),
        )
        response = model.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
                temperature=0.3,
            ),
        )
        recs = json.loads(response.text)
        if isinstance(recs, dict) and "recommendations" in recs:
            recs = recs["recommendations"]
        return [Recommendation(**r) for r in recs[:3]]
    except Exception as e:
        print(f"Gemini recommend error: {e}")
        return _fallback_recommendations(home, estimate)


# ---- Fallback rule-based recommendations ----

UPGRADE_CATALOG = [
    {
        "id": "solar",
        "title": "Install Rooftop Solar Panels",
        "description": "A 6kW solar system can offset 70-90% of your electricity usage, dramatically cutting your bill and carbon footprint. With federal tax credits (30% ITC), the effective cost is much lower.",
        "savings_pct": 0.35,
        "carbon_pct": 0.40,
        "cost_range": "$12,000 - $22,000 (before tax credits)",
        "payback": 6.5,
        "effort": "high",
        "category": "renewable",
        "condition": lambda h: not h.has_solar,
    },
    {
        "id": "heat_pump",
        "title": "Replace Furnace with Heat Pump",
        "description": "Modern cold-climate heat pumps are 3x more efficient than gas furnaces and provide both heating and cooling. This is the single biggest decarbonization step for most homes.",
        "savings_pct": 0.22,
        "carbon_pct": 0.30,
        "cost_range": "$8,000 - $16,000",
        "payback": 5.5,
        "effort": "high",
        "category": "heating",
        "condition": lambda h: h.heating_type in ("gas", "oil", "propane"),
    },
    {
        "id": "insulation",
        "title": "Air Seal & Insulate Attic/Walls",
        "description": "Sealing air leaks and adding insulation is the highest-ROI upgrade for older homes. It reduces heating and cooling energy by 15-25% and makes your home more comfortable.",
        "savings_pct": 0.18,
        "carbon_pct": 0.15,
        "cost_range": "$2,500 - $7,000",
        "payback": 3.0,
        "effort": "medium",
        "category": "insulation",
        "condition": lambda h: h.insulation != "good" or h.year_built < 2000,
    },
    {
        "id": "windows",
        "title": "Upgrade to Double-Pane Windows",
        "description": "Replacing old single-pane windows with ENERGY STAR double-pane reduces drafts, lowers heating/cooling costs by 12-15%, and improves comfort year-round.",
        "savings_pct": 0.12,
        "carbon_pct": 0.10,
        "cost_range": "$8,000 - $22,000",
        "payback": 8.0,
        "effort": "high",
        "category": "insulation",
        "condition": lambda h: h.windows == "single",
    },
    {
        "id": "hp_water_heater",
        "title": "Switch to Heat Pump Water Heater",
        "description": "Heat pump water heaters use 60% less energy than standard electric tanks. They also dehumidify the space they're in. A top pick for easy electrification.",
        "savings_pct": 0.08,
        "carbon_pct": 0.08,
        "cost_range": "$1,800 - $3,500",
        "payback": 4.0,
        "effort": "medium",
        "category": "appliance",
        "condition": lambda h: h.water_heater in ("electric", "gas"),
    },
    {
        "id": "smart_thermostat",
        "title": "Install a Smart Thermostat",
        "description": "Smart thermostats learn your schedule and optimize heating/cooling automatically. They save 10-15% on HVAC with zero behavior change needed.",
        "savings_pct": 0.10,
        "carbon_pct": 0.08,
        "cost_range": "$150 - $350",
        "payback": 0.5,
        "effort": "low",
        "category": "behavior",
        "condition": lambda h: True,
    },
    {
        "id": "led_lighting",
        "title": "Switch All Bulbs to LED",
        "description": "LEDs use 75% less energy and last 25x longer than incandescent. At ~$2/bulb, this is the easiest win in home energy efficiency.",
        "savings_pct": 0.04,
        "carbon_pct": 0.03,
        "cost_range": "$50 - $200",
        "payback": 0.3,
        "effort": "low",
        "category": "appliance",
        "condition": lambda h: True,
    },
    {
        "id": "ev",
        "title": "Switch to an Electric Vehicle",
        "description": "If you drive 12,000+ miles/year, switching from gas to EV can save $1,000-2,000/yr in fuel costs and dramatically cut transportation emissions.",
        "savings_pct": 0.0,  # separate from home energy
        "carbon_pct": 0.05,
        "cost_range": "$25,000 - $50,000",
        "payback": 5.0,
        "effort": "high",
        "category": "behavior",
        "condition": lambda h: not h.has_ev,
    },
]


def _fallback_recommendations(
    home: HomeProfile, estimate: EnergyEstimate
) -> list[Recommendation]:
    annual_cost = estimate.total_monthly_cost * 12
    annual_carbon = estimate.carbon_kg_per_month * 12

    eligible = [u for u in UPGRADE_CATALOG if u["condition"](home)]

    scored = []
    for u in eligible:
        savings = round(u["savings_pct"] * annual_cost)
        carbon = round(u["carbon_pct"] * annual_carbon)
        # Composite score: weight money 40%, carbon 40%, ease 20%
        effort_score = {"low": 1.0, "medium": 0.6, "high": 0.3}[u["effort"]]
        score = (savings / max(annual_cost, 1)) * 0.4 + (carbon / max(annual_carbon, 1)) * 0.4 + effort_score * 0.2
        scored.append((score, u, savings, carbon))

    scored.sort(key=lambda x: -x[0])

    results = []
    for rank, (_, u, savings, carbon) in enumerate(scored[:3], 1):
        results.append(Recommendation(
            rank=rank,
            title=u["title"],
            description=u["description"],
            estimated_annual_savings=savings,
            estimated_carbon_reduction_kg=carbon,
            upfront_cost_range=u["cost_range"],
            payback_years=u["payback"],
            effort_level=u["effort"],
            category=u["category"],
        ))

    return results
