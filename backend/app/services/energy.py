"""Energy estimation engine with climate zones, real utility rates, and proper modeling."""

from app.models import HomeProfile, BillData, EnergyEstimate

# US average electricity rates by region ($/kWh)
ELECTRICITY_RATES = {
    "northeast": 0.23, "southeast": 0.13, "midwest": 0.15,
    "southwest": 0.14, "west": 0.22, "northwest": 0.11,
    "default": 0.16,
}

# Gas rates ($/therm)
GAS_RATES = {
    "northeast": 1.50, "southeast": 1.10, "midwest": 1.05,
    "southwest": 1.15, "west": 1.40, "northwest": 1.00,
    "default": 1.20,
}

# Climate zone from ZIP prefix (simplified)
ZIP_TO_REGION = {
    "0": "northeast", "1": "northeast", "2": "southeast",
    "3": "southeast", "4": "midwest", "5": "midwest",
    "6": "midwest", "7": "southwest", "8": "southwest",
    "9": "west",
}

# Heating/cooling degree-day multipliers by region
HEATING_MULTIPLIER = {
    "northeast": 1.4, "southeast": 0.6, "midwest": 1.3,
    "southwest": 0.4, "west": 0.7, "northwest": 1.1, "default": 1.0,
}
COOLING_MULTIPLIER = {
    "northeast": 0.7, "southeast": 1.5, "midwest": 0.9,
    "southwest": 1.6, "west": 1.0, "northwest": 0.4, "default": 1.0,
}

# Carbon factors
CO2_KG_PER_KWH = 0.417   # EPA eGRID US avg
CO2_KG_PER_THERM = 5.3    # EPA
KG_CO2_PER_TREE_PER_YEAR = 22.0  # EPA estimate


def get_region(zip_code: str) -> str:
    if zip_code and len(zip_code) >= 1:
        return ZIP_TO_REGION.get(zip_code[0], "default")
    return "default"


def estimate_energy(home: HomeProfile, bill: BillData | None = None) -> EnergyEstimate:
    region = get_region(home.zip_code)
    elec_rate = ELECTRICITY_RATES.get(region, ELECTRICITY_RATES["default"])
    gas_rate = GAS_RATES.get(region, GAS_RATES["default"])
    heat_mult = HEATING_MULTIPLIER.get(region, 1.0)
    cool_mult = COOLING_MULTIPLIER.get(region, 1.0)

    breakdown = {}

    # --- Base load (lighting, plugs, appliances) ---
    # DOE: ~30% of residential electricity is baseload
    base_kwh = home.sqft * 0.25 + home.num_occupants * 80
    breakdown["base_load"] = round(base_kwh)

    # --- Heating ---
    heating_kwh = 0.0
    heating_therms = 0.0

    if home.heating_type in ("gas", "oil", "propane"):
        # Gas furnace: ~0.5 therms per 100 sqft/month, adjusted by climate + efficiency
        heating_therms = home.sqft * 0.005 * heat_mult
        # Envelope efficiency
        insulation_factor = {"poor": 1.35, "average": 1.0, "good": 0.75}.get(home.insulation, 1.0)
        window_factor = {"single": 1.2, "double": 1.0, "triple": 0.85}.get(home.windows, 1.0)
        heating_therms *= insulation_factor * window_factor
        # Fan electricity for furnace
        heating_kwh = 50 * heat_mult
    elif home.heating_type == "electric":
        # Electric resistance: ~3.4 kWh per therm-equivalent
        equiv_therms = home.sqft * 0.005 * heat_mult
        insulation_factor = {"poor": 1.35, "average": 1.0, "good": 0.75}.get(home.insulation, 1.0)
        window_factor = {"single": 1.2, "double": 1.0, "triple": 0.85}.get(home.windows, 1.0)
        heating_kwh = equiv_therms * 29.3 * insulation_factor * window_factor  # therms to kWh
    elif home.heating_type == "heat_pump":
        # Heat pump COP ~3.0 — uses 1/3 the electricity of resistance
        equiv_therms = home.sqft * 0.005 * heat_mult
        insulation_factor = {"poor": 1.35, "average": 1.0, "good": 0.75}.get(home.insulation, 1.0)
        window_factor = {"single": 1.2, "double": 1.0, "triple": 0.85}.get(home.windows, 1.0)
        heating_kwh = (equiv_therms * 29.3 * insulation_factor * window_factor) / 3.0

    breakdown["heating"] = round(heating_kwh + heating_therms * 29.3)  # normalize to kWh-equiv

    # --- Cooling ---
    cooling_kwh = 0.0
    if home.cooling_type == "central_ac":
        # Central AC: ~1.2 kWh per sqft per cooling season, monthified
        cooling_kwh = home.sqft * 0.1 * cool_mult
    elif home.cooling_type == "window_ac":
        cooling_kwh = home.sqft * 0.06 * cool_mult

    insulation_factor = {"poor": 1.3, "average": 1.0, "good": 0.8}.get(home.insulation, 1.0)
    cooling_kwh *= insulation_factor
    breakdown["cooling"] = round(cooling_kwh)

    # --- Water heating ---
    if home.water_heater == "gas":
        water_therms = home.num_occupants * 5  # ~5 therms/person/month
        water_kwh = 5  # minimal electric for ignition/controls
        heating_therms += water_therms
    elif home.water_heater == "electric":
        water_kwh = home.num_occupants * 145  # ~145 kWh/person/month
        water_therms = 0
    elif home.water_heater == "heat_pump":
        water_kwh = home.num_occupants * 50   # COP ~3
        water_therms = 0
    elif home.water_heater == "tankless":
        water_therms = home.num_occupants * 3.5
        water_kwh = 2
        heating_therms += water_therms
    else:
        water_kwh = home.num_occupants * 145
        water_therms = 0

    breakdown["water_heating"] = round(water_kwh + water_therms * 29.3)

    # --- Pool ---
    pool_kwh = 0
    if home.has_pool:
        pool_kwh = 150 * cool_mult + 100  # pump + heating assist
    breakdown["pool"] = round(pool_kwh)

    # --- EV charging ---
    ev_kwh = 0
    if home.has_ev:
        ev_kwh = 300  # ~1000 miles/month, 3.3 mi/kWh
    breakdown["ev_charging"] = round(ev_kwh)

    # --- Solar offset ---
    solar_kwh = 0
    if home.has_solar:
        # Average 6kW system produces ~750 kWh/month, adjusted by region sunlight
        sun_factor = {"southwest": 1.3, "west": 1.1, "southeast": 1.0,
                      "midwest": 0.85, "northeast": 0.8, "northwest": 0.7, "default": 0.9}
        solar_kwh = -750 * sun_factor.get(region, 0.9)
    breakdown["solar_offset"] = round(solar_kwh)

    # --- Age penalty ---
    age_factor = 1.0
    if home.year_built < 1960:
        age_factor = 1.25
    elif home.year_built < 1980:
        age_factor = 1.15
    elif home.year_built < 2000:
        age_factor = 1.07

    # --- Totals ---
    total_kwh = (base_kwh + heating_kwh + cooling_kwh + water_kwh + pool_kwh + ev_kwh + solar_kwh) * age_factor
    total_therms = heating_therms * age_factor
    total_kwh = max(total_kwh, 100)
    total_therms = max(total_therms, 0)

    # If bill data provided, blend estimates with actuals
    if bill:
        if bill.kwh_used and bill.kwh_used > 0:
            total_kwh = bill.kwh_used * 0.6 + total_kwh * 0.4
        if bill.therms_used and bill.therms_used > 0:
            total_therms = bill.therms_used * 0.6 + total_therms * 0.4

    total_kwh = round(total_kwh)
    total_therms = round(total_therms)

    electric_cost = round(total_kwh * elec_rate, 2)
    gas_cost = round(total_therms * gas_rate, 2)
    total_cost = bill.monthly_cost if (bill and bill.monthly_cost) else round(electric_cost + gas_cost, 2)

    carbon_kg = round(total_kwh * CO2_KG_PER_KWH + total_therms * CO2_KG_PER_THERM)
    trees = round(carbon_kg * 12 / KG_CO2_PER_TREE_PER_YEAR, 1)  # annualize

    return EnergyEstimate(
        kwh_per_month=total_kwh,
        therms_per_month=total_therms,
        electric_cost=electric_cost,
        gas_cost=gas_cost,
        total_monthly_cost=total_cost,
        carbon_kg_per_month=carbon_kg,
        carbon_trees_equivalent=trees,
        breakdown=breakdown,
    )
