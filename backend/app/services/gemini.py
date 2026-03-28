"""Gemini API integration for natural language parsing."""

import json
import os
import google.generativeai as genai

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

model = None


def _get_model():
    global model
    if model is None:
        model = genai.GenerativeModel("gemini-2.0-flash")
    return model


HOME_PARSE_PROMPT = """You are an energy auditor assistant. Extract structured home data from this user description.

Return ONLY valid JSON with these fields (use null for unknown):
{
  "sqft": <int or null>,
  "bedrooms": <int or null>,
  "bathrooms": <int or null>,
  "year_built": <int or null>,
  "heating_type": <"gas"|"electric"|"heat_pump"|"oil"|"propane" or null>,
  "cooling_type": <"central_ac"|"window_ac"|"none" or null>,
  "water_heater": <"gas"|"electric"|"heat_pump"|"tankless" or null>,
  "insulation": <"poor"|"average"|"good" or null>,
  "windows": <"single"|"double"|"triple" or null>,
  "has_solar": <bool>,
  "has_pool": <bool>,
  "has_ev": <bool>,
  "num_occupants": <int or null>,
  "appliances": [<list of notable appliances/devices mentioned>],
  "habits": <string summary of energy-related habits mentioned, or null>
}

User description:
"""

BILL_PARSE_PROMPT = """You are a utility bill parser. Extract billing data from this text (which may be copied from a PDF or typed by hand).

Return ONLY valid JSON:
{
  "monthly_cost": <float total amount due, or null>,
  "kwh_used": <float electricity usage in kWh, or null>,
  "therms_used": <float gas usage in therms, or null>,
  "billing_period": <string like "Jan 2024 - Feb 2024", or null>,
  "provider": <string utility company name, or null>,
  "rate_plan": <string rate/tariff plan name, or null>
}

Bill text:
"""


async def parse_home_text(text: str) -> dict:
    """Use Gemini to parse a natural-language home description into structured data."""
    if not GEMINI_API_KEY:
        return _fallback_parse_home(text)

    try:
        m = _get_model()
        response = m.generate_content(
            HOME_PARSE_PROMPT + text,
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
                temperature=0.1,
            ),
        )
        data = json.loads(response.text)
        return {k: v for k, v in data.items() if v is not None}
    except Exception as e:
        print(f"Gemini home parse error: {e}")
        return _fallback_parse_home(text)


async def parse_bill_text(text: str) -> dict:
    """Use Gemini to parse utility bill text into structured data."""
    if not GEMINI_API_KEY:
        return _fallback_parse_bill(text)

    try:
        m = _get_model()
        response = m.generate_content(
            BILL_PARSE_PROMPT + text,
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
                temperature=0.1,
            ),
        )
        data = json.loads(response.text)
        return {k: v for k, v in data.items() if v is not None}
    except Exception as e:
        print(f"Gemini bill parse error: {e}")
        return _fallback_parse_bill(text)


# ---- Fallbacks (regex-based, used when no API key) ----

import re


def _fallback_parse_home(text: str) -> dict:
    t = text.lower()
    result = {}
    m = re.search(r"([\d,]+)\s*(?:sq\.?\s*ft|square\s*feet)", t)
    if m:
        result["sqft"] = int(m.group(1).replace(",", ""))
    m = re.search(r"(\d+)\s*(?:bed(?:room)?s?|br)", t)
    if m:
        result["bedrooms"] = int(m.group(1))
    m = re.search(r"(?:built\s*(?:in\s*)?|from\s*)(\d{4})", t)
    if m:
        result["year_built"] = int(m.group(1))
    for ht in ["heat pump", "gas", "electric", "oil", "propane"]:
        if ht in t:
            result["heating_type"] = ht.replace(" ", "_")
            break
    if re.search(r"\b(central\s*a/?c|central\s*air)", t):
        result["cooling_type"] = "central_ac"
    elif re.search(r"\b(window\s*a/?c|window\s*unit)", t):
        result["cooling_type"] = "window_ac"
    if "solar" in t and "no solar" not in t:
        result["has_solar"] = True
    if "pool" in t and "no pool" not in t:
        result["has_pool"] = True
    if re.search(r"\b(ev|electric\s*vehicle|tesla|charger)\b", t):
        result["has_ev"] = True
    # Occupants
    m = re.search(r"(\d+)\s*(?:people|person|occupant|resident|family\s*of)", t)
    if m:
        result["num_occupants"] = int(m.group(1))
    m = re.search(r"family\s*of\s*(\d+)", t)
    if m:
        result["num_occupants"] = int(m.group(1))
    # Insulation
    for level in ["poor", "good", "average"]:
        if level in t and "insulation" in t:
            result["insulation"] = level
            break
    # Windows
    if re.search(r"\b(single\s*pane|single-pane)\b", t):
        result["windows"] = "single"
    elif re.search(r"\b(double\s*pane|double-pane)\b", t):
        result["windows"] = "double"
    # Water heater
    if "tankless" in t:
        result["water_heater"] = "tankless"
    elif re.search(r"(heat\s*pump\s*water|hybrid\s*water)", t):
        result["water_heater"] = "heat_pump"
    return result


def _fallback_parse_bill(text: str) -> dict:
    t = text.lower()
    result = {}
    m = re.search(r"\$\s*([\d,]+(?:\.\d{2})?)", t)
    if m:
        result["monthly_cost"] = float(m.group(1).replace(",", ""))
    m = re.search(r"([\d,]+(?:\.\d+)?)\s*kwh", t)
    if m:
        result["kwh_used"] = float(m.group(1).replace(",", ""))
    m = re.search(r"([\d,]+(?:\.\d+)?)\s*therms?", t)
    if m:
        result["therms_used"] = float(m.group(1).replace(",", ""))
    return result
