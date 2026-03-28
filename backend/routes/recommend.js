// Rule-based recommendation engine: picks top 3 upgrades based on home profile.
const UPGRADES = [
  {
    id: "solar",
    title: "Install Solar Panels",
    description: "A 6kW rooftop solar system can offset 70-90% of electricity usage.",
    savingsPercent: 35,
    costRange: "$15,000 - $25,000",
    paybackYears: 7,
    carbonReduction: 40,
    condition: (home) => !home.hasSolar,
  },
  {
    id: "heat_pump",
    title: "Switch to Heat Pump",
    description: "Modern heat pumps are 3x more efficient than gas furnaces and provide AC too.",
    savingsPercent: 25,
    costRange: "$8,000 - $15,000",
    paybackYears: 5,
    carbonReduction: 30,
    condition: (home) => home.heating === "gas" || home.heating === "oil",
  },
  {
    id: "insulation",
    title: "Upgrade Insulation & Air Sealing",
    description: "Sealing leaks and adding insulation reduces heating/cooling energy by up to 20%.",
    savingsPercent: 15,
    costRange: "$2,000 - $6,000",
    paybackYears: 3,
    carbonReduction: 15,
    condition: (home) => home.yearBuilt < 2000,
  },
  {
    id: "windows",
    title: "Replace Windows with Double-Pane",
    description: "Energy-efficient windows reduce drafts and lower heating/cooling bills.",
    savingsPercent: 12,
    costRange: "$8,000 - $20,000",
    paybackYears: 8,
    carbonReduction: 10,
    condition: (home) => home.yearBuilt < 1990,
  },
  {
    id: "water_heater",
    title: "Heat Pump Water Heater",
    description: "Uses 60% less energy than a standard electric water heater.",
    savingsPercent: 10,
    costRange: "$1,500 - $3,000",
    paybackYears: 4,
    carbonReduction: 8,
    condition: () => true,
  },
  {
    id: "smart_thermostat",
    title: "Install Smart Thermostat",
    description: "Programmable smart thermostats save 10-15% on heating and cooling.",
    savingsPercent: 10,
    costRange: "$150 - $300",
    paybackYears: 1,
    carbonReduction: 8,
    condition: () => true,
  },
  {
    id: "led",
    title: "Switch to LED Lighting",
    description: "LEDs use 75% less energy than incandescent bulbs and last 25x longer.",
    savingsPercent: 5,
    costRange: "$100 - $300",
    paybackYears: 0.5,
    carbonReduction: 3,
    condition: () => true,
  },
];

function recommend(req, res) {
  const { home, estimate: est } = req.body;
  if (!home) return res.status(400).json({ error: "home is required" });

  const eligible = UPGRADES.filter((u) => u.condition(home));

  // Score by savings * carbon reduction, pick top 3
  const scored = eligible
    .map((u) => ({
      ...u,
      score: u.savingsPercent * u.carbonReduction,
      estimatedAnnualSaving: est ? Math.round((u.savingsPercent / 100) * est.monthlyCost * 12) : null,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  // Remove internal fields
  const recommendations = scored.map(({ condition, score, ...rest }) => rest);

  res.json({ recommendations });
}

module.exports = { recommend };
