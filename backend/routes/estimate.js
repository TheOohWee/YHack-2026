// Rule-based estimator: computes monthly energy, cost, and carbon from home profile.
const CO2_PER_KWH = 0.42; // kg CO2 per kWh (US avg)
const CO2_PER_THERM = 5.3; // kg CO2 per therm
const COST_PER_KWH = 0.16;
const COST_PER_THERM = 1.2;

function estimate(req, res) {
  const { home, bill } = req.body;
  if (!home) return res.status(400).json({ error: "home is required" });

  // Base electricity from sqft
  let kwhPerMonth = home.sqft * 0.7;

  // Adjustments
  if (home.hasAC) kwhPerMonth += 300;
  if (home.hasPool) kwhPerMonth += 200;
  if (home.hasSolar) kwhPerMonth -= 400;
  if (home.heating === "electric" || home.heating === "heat pump") kwhPerMonth += 400;

  // Older homes are less efficient
  if (home.yearBuilt < 1980) kwhPerMonth *= 1.2;
  else if (home.yearBuilt < 2000) kwhPerMonth *= 1.1;

  kwhPerMonth = Math.max(kwhPerMonth, 200);

  // Gas usage estimate (therms)
  let thermsPerMonth = 0;
  if (home.heating === "gas" || home.heating === "oil" || home.heating === "propane") {
    thermsPerMonth = home.sqft * 0.03;
    if (home.yearBuilt < 1980) thermsPerMonth *= 1.25;
  }

  // If bill data provided, blend with estimates (trust bill more)
  if (bill) {
    if (bill.kwhUsed) kwhPerMonth = bill.kwhUsed * 0.7 + kwhPerMonth * 0.3;
    if (bill.thermsUsed) thermsPerMonth = bill.thermsUsed * 0.7 + thermsPerMonth * 0.3;
  }

  kwhPerMonth = Math.round(kwhPerMonth);
  thermsPerMonth = Math.round(thermsPerMonth);

  const electricCost = kwhPerMonth * COST_PER_KWH;
  const gasCost = thermsPerMonth * COST_PER_THERM;
  const totalCost = bill?.monthlyCost || Math.round(electricCost + gasCost);

  const carbonKg = Math.round(kwhPerMonth * CO2_PER_KWH + thermsPerMonth * CO2_PER_THERM);

  res.json({
    estimate: {
      kwhPerMonth,
      thermsPerMonth,
      monthlyCost: Math.round(totalCost),
      carbonKgPerMonth: carbonKg,
      electricCost: Math.round(electricCost),
      gasCost: Math.round(gasCost),
    },
  });
}

module.exports = { estimate };
