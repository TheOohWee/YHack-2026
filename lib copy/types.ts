export type HomeType = "apartment" | "house" | "dorm";

export type ApplianceKey =
  | "laundry"
  | "dishwasher"
  | "ac_heating"
  | "ev_charging"
  | "oven_stove";

// Index into HOURS array (0 = midnight, 23 = 11pm)
export type HourIndex = number;

export interface UserInput {
  zipCode: string;
  homeType: HomeType;
  appliances: ApplianceKey[];
  timings: Partial<Record<ApplianceKey, HourIndex>>;
  monthlyBill?: number; // dollars, optional
}

export interface ApplianceResult {
  key: ApplianceKey;
  name: string;
  emoji: string;
  usesPerMonth: number;
  kWhPerUse: number;
  currentHour: HourIndex;
  optimalHour: HourIndex; // cheapest + cleanest combined
  currentMonthlyCost: number; // dollars
  optimalMonthlyCost: number;
  savingsDollars: number;
  currentMonthlyEmissions: number; // lbs CO2
  optimalMonthlyEmissions: number;
  savingsLbsCO2: number;
}

export interface DashboardData {
  input: UserInput;
  results: ApplianceResult[];
  totalCurrentCost: number;
  totalSavings: number;
  totalCO2Saved: number; // lbs/month
  recommendations: string[];
  // For the what-if simulator overrides
  overrides: Partial<Record<ApplianceKey, HourIndex>>;
}
