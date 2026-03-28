export type EnergyLogPoint = {
  timestamp: string;
  wind_pct: number;
  solar_pct: number;
  fossil_pct: number;
  nuclear_pct: number;
  hydro_pct: number;
  /** Biomass, storage, imports, synch, unmapped labels, etc. */
  other_pct: number;
  price_cents: number;
  renewable_pct?: number;
  eco_efficiency_score?: number;
  z_score?: number | null;
  gridstatus_ok?: boolean;
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
  /** Latest eco z-score strictly above 2 — high-contrast bento alert. */
  ecoZScoreAlert: boolean;
  /** True when `insight` comes from Mongo `social_message` / `llm_analysis`. */
  insightFromLlm: boolean;
  status: {
    active: boolean;
    lastPollMinutesAgo: number | null;
  };
};
