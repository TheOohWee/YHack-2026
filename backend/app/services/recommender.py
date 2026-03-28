"""AI-powered recommendation engine.

Priority: K2 Think V2 (via MBZUAI API) → Gemini → rule-based fallback.
All calls optionally routed through Lava gateway for unified tracking.
"""

import json
import os
import google.generativeai as genai
from app.models import HomeProfile, EnergyEstimate, Recommendation
from app.services.lava import forward_request

K2_API_KEY = os.getenv("K2_API_KEY", "")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
K2_ENDPOINT = "https://api.k2think.ai/v1/chat/completions"
K2_MODEL = "MBZUAI-IFM/K2-Think-v2"

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

Rank by combined impact: prioritize recommendations that save the most money AND carbon with reasonable payback periods. Be specific to this home — don't give generic advice.
Return ONLY the JSON array, no markdown, no explanation."""


async def get_recommendations(
    home: HomeProfile, estimate: EnergyEstimate
) -> list[Recommendation]:
    """Try K2 Think V2 first, fall back to Gemini, then rule-based."""

    prompt = RECOMMEND_PROMPT.format(
        home_json=home.model_dump_json(indent=2),
        estimate_json=estimate.model_dump_json(indent=2),
    )

    # 1. Try K2 Think V2 via MBZUAI API (routed through Lava if available)
    if K2_API_KEY:
        try:
            recs = await _call_k2(prompt)
            if recs:
                print("[recommender] Used K2 Think V2 via Cerebras")
                return recs
        except Exception as e:
            print(f"[recommender] K2 Think V2 error: {e}")

    # 2. Fall back to Gemini
    if GEMINI_API_KEY:
        try:
            recs = await _call_gemini(prompt)
            if recs:
                print("[recommender] Used Gemini Flash")
                return recs
        except Exception as e:
            print(f"[recommender] Gemini error: {e}")

    # 3. Fall back to rule-based
    print("[recommender] Using rule-based fallback")
    return _fallback_recommendations(home, estimate)


async def _call_k2(prompt: str) -> list[Recommendation] | None:
    """Call K2 Think V2 via MBZUAI API, optionally through Lava gateway."""
    payload = {
        "model": K2_MODEL,
        "messages": [
            {
                "role": "system",
                "content": "You are a home energy efficiency expert. Always respond with valid JSON only.",
            },
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.3,
        "max_tokens": 4000,
        "stream": False,
    }

    # Route through Lava if available, otherwise direct to K2 API
    data = await forward_request(K2_ENDPOINT, payload, K2_API_KEY)

    content = data["choices"][0]["message"]["content"]
    # K2 may include thinking tags — extract JSON from response
    content = _extract_json(content)
    recs = json.loads(content)
    if isinstance(recs, dict) and "recommendations" in recs:
        recs = recs["recommendations"]
    return [Recommendation(**r) for r in recs[:3]]


async def _call_gemini(prompt: str) -> list[Recommendation] | None:
    """Call Gemini Flash for recommendations."""
    model = genai.GenerativeModel("gemini-2.5-flash")
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


def _extract_json(text: str) -> str:
    """Extract JSON from a response that may contain thinking/reasoning and markdown."""
    import re
    # Strip <think>...</think> tags if present
    text = re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL)
    # Strip markdown code fences
    text = re.sub(r"```(?:json)?\s*", "", text)
    text = re.sub(r"```", "", text)
    text = text.strip()
    # If there's still no JSON array, try to find one embedded in the text
    if not text.startswith("[") and not text.startswith("{"):
        # Find the first [ ... ] block
        match = re.search(r"\[[\s\S]*\]", text)
        if match:
            text = match.group(0)
        else:
            # Try finding a { ... } block
            match = re.search(r"\{[\s\S]*\}", text)
            if match:
                text = match.group(0)
    return text


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
        "savings_pct": 0.0,
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
