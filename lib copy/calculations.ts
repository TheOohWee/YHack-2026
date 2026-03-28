import {
  HOURLY_PRICE_CENTS,
  HOURLY_EMISSIONS_LBS,
  APPLIANCES,
} from "./data";
import { ApplianceKey, ApplianceResult, UserInput } from "./types";

// Score each hour: combined rank of price + emissions (lower = better).
// Returns array of { hour, score } sorted best first.
function hourScores(): { hour: number; score: number }[] {
  const maxPrice = Math.max(...HOURLY_PRICE_CENTS);
  const maxEmit = Math.max(...HOURLY_EMISSIONS_LBS);
  return Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    score:
      HOURLY_PRICE_CENTS[h] / maxPrice +
      HOURLY_EMISSIONS_LBS[h] / maxEmit,
  })).sort((a, b) => a.score - b.score);
}

const SCORES = hourScores();

export function bestHour(): number {
  return SCORES[0].hour;
}

function optimalHourFor(_key: ApplianceKey): number {
  // Best combined price+emissions hour for this appliance.
  // For now same for all; could be extended to weight by appliance type.
  return SCORES[0].hour;
}

export function computeResults(
  input: UserInput,
  overrides: Partial<Record<ApplianceKey, number>> = {}
): ApplianceResult[] {
  return input.appliances.map((key) => {
    const spec = APPLIANCES[key];
    const currentHour = overrides[key] ?? input.timings[key] ?? 18;
    const optimal = optimalHourFor(key);

    const pricePerKWh = (h: number) => HOURLY_PRICE_CENTS[h] / 100;
    const emitPerKWh = (h: number) => HOURLY_EMISSIONS_LBS[h];

    const currentMonthlyCost =
      spec.kWhPerUse * spec.usesPerMonth * pricePerKWh(currentHour);
    const optimalMonthlyCost =
      spec.kWhPerUse * spec.usesPerMonth * pricePerKWh(optimal);
    const currentMonthlyEmissions =
      spec.kWhPerUse * spec.usesPerMonth * emitPerKWh(currentHour);
    const optimalMonthlyEmissions =
      spec.kWhPerUse * spec.usesPerMonth * emitPerKWh(optimal);

    return {
      key,
      name: spec.name,
      emoji: spec.emoji,
      usesPerMonth: spec.usesPerMonth,
      kWhPerUse: spec.kWhPerUse,
      currentHour,
      optimalHour: optimal,
      currentMonthlyCost,
      optimalMonthlyCost,
      savingsDollars: currentMonthlyCost - optimalMonthlyCost,
      currentMonthlyEmissions,
      optimalMonthlyEmissions,
      savingsLbsCO2: currentMonthlyEmissions - optimalMonthlyEmissions,
    };
  });
}

export function totalSavings(results: ApplianceResult[]) {
  return {
    dollars: results.reduce((s, r) => s + r.savingsDollars, 0),
    co2: results.reduce((s, r) => s + r.savingsLbsCO2, 0),
    currentCost: results.reduce((s, r) => s + r.currentMonthlyCost, 0),
  };
}

export function generateRecommendations(
  results: ApplianceResult[],
  input: UserInput
): string[] {
  const recs: string[] = [];

  // Sort by savings potential
  const sorted = [...results].sort((a, b) => b.savingsDollars - a.savingsDollars);

  for (const r of sorted.slice(0, 3)) {
    if (r.savingsDollars < 0.5) continue;

    const fromHour = formatHour(r.currentHour);
    const toHour = formatHour(r.optimalHour);
    const dollars = r.savingsDollars.toFixed(1);
    const co2 = r.savingsLbsCO2.toFixed(0);

    if (r.key === "ac_heating") {
      recs.push(
        `Pre-cool or pre-heat before ${fromHour} so your ${r.name.toLowerCase()} runs less during peak hours. That alone could save ~$${dollars}/mo and avoid ~${co2} lbs of CO₂.`
      );
    } else if (r.key === "ev_charging") {
      recs.push(
        `Plug in your EV around ${toHour} instead of ${fromHour}. Overnight rates are cheapest and the grid is cleaner — saving ~$${dollars}/mo and ~${co2} lbs CO₂.`
      );
    } else {
      recs.push(
        `Run your ${r.name.toLowerCase()} around ${toHour} instead of ${fromHour}. Grid prices and emissions are much lower then — saving ~$${dollars}/mo and ~${co2} lbs CO₂.`
      );
    }
  }

  if (recs.length === 0) {
    recs.push("Your habits are already pretty well-timed! Try shifting any peak-hour appliances to late night for extra savings.");
  }

  // Add a general tip
  if (input.homeType === "apartment") {
    recs.push("Apartments lose heat/cool quickly — a smart plug-in timer for your AC can automate off-peak scheduling with no effort.");
  } else if (input.homeType === "house") {
    recs.push("Consider a smart thermostat (e.g. Nest, Ecobee) to automatically pre-condition your home before peak hours and save year-round.");
  } else {
    recs.push("Dorm residents: coordinate laundry runs with floor-mates for overnight slots — most campus laundry rooms are empty and rates are cheapest then.");
  }

  return recs.slice(0, 3);
}

export function formatHour(h: number): string {
  if (h === 0) return "12am";
  if (h === 12) return "12pm";
  return h < 12 ? `${h}am` : `${h - 12}pm`;
}

// Cheapest 3 hours and dirtiest 3 hours for summary cards
export function cheapestHours(n = 3): number[] {
  return [...HOURLY_PRICE_CENTS]
    .map((p, h) => ({ h, p }))
    .sort((a, b) => a.p - b.p)
    .slice(0, n)
    .map((x) => x.h);
}

export function cleanestHours(n = 3): number[] {
  return [...HOURLY_EMISSIONS_LBS]
    .map((e, h) => ({ h, e }))
    .sort((a, b) => a.e - b.e)
    .slice(0, n)
    .map((x) => x.h);
}

export function dirtiestHours(n = 3): number[] {
  return [...HOURLY_EMISSIONS_LBS]
    .map((e, h) => ({ h, e }))
    .sort((a, b) => b.e - a.e)
    .slice(0, n)
    .map((x) => x.h);
}

export function mostExpensiveHours(n = 3): number[] {
  return [...HOURLY_PRICE_CENTS]
    .map((p, h) => ({ h, p }))
    .sort((a, b) => b.p - a.p)
    .slice(0, n)
    .map((x) => x.h);
}
