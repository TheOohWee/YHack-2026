export type EnergyLogPoint = {
  timestamp: string;
  /** Granular fuel mix (% of total MW) — matches Python `FuelMix` / Mongo. */
  nuclear: number;
  coal: number;
  natural_gas: number;
  wind: number;
  solar: number;
  battery_storage: number;
  imports: number;
  other: number;
  price_cents: number;
  renewable_pct?: number;
  eco_efficiency_score: number | null;
  z_score?: number | null;
  gridstatus_ok?: boolean;
};

/** Rolling green-poll streak from Mongo `streaks` (updated each poll). */
export type GreenStreakState = {
  currentStreak: number;
  longestStreak: number;
  /** Distinct UTC calendar days in the current trailing green run (drives leaf count). */
  streakCalendarDays: number;
  lastPollWasGreen: boolean | null;
  rollingMedianAtPoll: number | null;
  lastEcoScore: number | null;
  /** True when values come from `DEMO_GREEN_STREAK_FALLBACK` (no DB doc). */
  isMock?: boolean;
};

export type EnergySnapshot = {
  userId: string;
  stats: {
    total_carbon_saved_kg: number;
    total_dollars_saved: number;
  };
  logs: EnergyLogPoint[];
  latest: EnergyLogPoint | null;
  /** Latest raw log as plain JSON (no ObjectId / Date instances). */
  latestRaw?: Record<string, unknown> | null;
  dialPercent: number;
  priceZScore: number | null;
  pricePulseAmber: boolean;
  goldenWindows: { start: string; end: string }[];
  insight: string;
  /** Eco-efficiency z-score from latest log (vs recent poll history). */
  ecoZScore: number | null;
  /** True when `insight` comes from Mongo `social_message` / `llm_analysis`. */
  insightFromLlm: boolean;
  status: {
    active: boolean;
    lastPollMinutesAgo: number | null;
    lastPolledLabel: string;
  };
  /** Always set; uses demo fallback if Mongo `streaks` is missing. */
  streak: GreenStreakState;
};
