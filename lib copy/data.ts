import { ApplianceKey } from "./types";

// ─── Hourly price curve ───────────────────────────────────────────────────────
// Typical TOU (Time-of-Use) rate in cents/kWh inspired by CA/PG&E E-TOU-C.
// Off-peak: night & early AM. Peak: 4–9 PM. Super-off-peak: midday (solar surplus).
export const HOURLY_PRICE_CENTS: number[] = [
  9,  // 12am
  8,  // 1am
  8,  // 2am
  8,  // 3am
  8,  // 4am
  9,  // 5am
  13, // 6am
  16, // 7am
  17, // 8am
  14, // 9am
  11, // 10am  (solar coming up)
  10, // 11am
  9,  // 12pm  (peak solar — cheapest)
  9,  // 1pm
  10, // 2pm
  13, // 3pm
  20, // 4pm  (peak starts)
  27, // 5pm
  30, // 6pm  (hardest peak)
  29, // 7pm
  26, // 8pm
  18, // 9pm  (peak ends)
  12, // 10pm
  10, // 11pm
];

// ─── Hourly carbon intensity ──────────────────────────────────────────────────
// lbs CO2 per kWh. High at night (gas baseload), low midday (solar), very high
// during evening peak (gas peaker plants spin up).
export const HOURLY_EMISSIONS_LBS: number[] = [
  0.40, // 12am
  0.36, // 1am
  0.33, // 2am
  0.31, // 3am
  0.30, // 4am  (lowest demand, cleanest)
  0.33, // 5am
  0.42, // 6am
  0.50, // 7am
  0.54, // 8am
  0.50, // 9am
  0.40, // 10am
  0.30, // 11am
  0.22, // 12pm  (peak solar — cleanest midday)
  0.20, // 1pm
  0.23, // 2pm
  0.32, // 3pm
  0.50, // 4pm
  0.68, // 5pm  (gas peakers)
  0.74, // 6pm  (dirtiest hour)
  0.72, // 7pm
  0.65, // 8pm
  0.56, // 9pm
  0.48, // 10pm
  0.44, // 11pm
];

export const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function formatHour(h: number): string {
  if (h === 0) return "12am";
  if (h === 12) return "12pm";
  return h < 12 ? `${h}am` : `${h - 12}pm`;
}

// ─── Appliance specs ──────────────────────────────────────────────────────────
export interface ApplianceSpec {
  name: string;
  emoji: string;
  kWhPerUse: number;
  usesPerMonth: number; // default assumption
  description: string; // shown in form
}

export const APPLIANCES: Record<ApplianceKey, ApplianceSpec> = {
  laundry: {
    name: "Laundry",
    emoji: "🫧",
    kWhPerUse: 2.3,       // washer ~0.5 kWh + dryer ~1.8 kWh per load
    usesPerMonth: 12,      // ~3x/week
    description: "Washer + dryer",
  },
  dishwasher: {
    name: "Dishwasher",
    emoji: "🍽️",
    kWhPerUse: 1.2,
    usesPerMonth: 25,      // nearly daily
    description: "Full cycle with heat dry",
  },
  ac_heating: {
    name: "AC / Heating",
    emoji: "❄️",
    kWhPerUse: 3.5,        // kWh per hour of use
    usesPerMonth: 60,      // ~2 hrs/day
    description: "HVAC system, per hour of heavy use",
  },
  ev_charging: {
    name: "EV Charging",
    emoji: "⚡",
    kWhPerUse: 10.0,       // Level 2 charger, ~1.5 hr session
    usesPerMonth: 12,      // ~3x/week
    description: "Level 2 home charger session",
  },
  oven_stove: {
    name: "Oven / Stove",
    emoji: "🍳",
    kWhPerUse: 1.8,
    usesPerMonth: 20,      // cooking most evenings
    description: "Cooking full meal",
  },
};

// ─── Demo user ────────────────────────────────────────────────────────────────
// Pre-loaded for hackathon demos.
import { UserInput } from "./types";

export const DEMO_USER: UserInput = {
  zipCode: "94102",
  homeType: "apartment",
  appliances: ["laundry", "dishwasher", "ac_heating", "oven_stove"],
  timings: {
    laundry: 15,       // 3pm
    dishwasher: 20,    // 8pm
    ac_heating: 18,    // 6pm peak
    oven_stove: 19,    // 7pm
  },
  monthlyBill: 130,
};

// ─── Time slot presets (for form dropdowns) ───────────────────────────────────
export const TIME_SLOTS: { label: string; hour: number }[] = [
  { label: "Overnight (1am–5am)", hour: 2 },
  { label: "Early morning (6–8am)", hour: 7 },
  { label: "Morning (9am–12pm)", hour: 10 },
  { label: "Afternoon (12–4pm)", hour: 14 },
  { label: "Evening peak (4–9pm)", hour: 18 },
  { label: "Late evening (9pm–midnight)", hour: 22 },
];
