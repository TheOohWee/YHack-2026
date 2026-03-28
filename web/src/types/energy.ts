export type EnergyLogPoint = {
  timestamp: string;
  wind_pct: number;
  solar_pct: number;
  fossil_pct: number;
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
  latestRaw?: Record<string, unknown> | null;
  dialPercent: number;
  priceZScore: number | null;
  pricePulseAmber: boolean;
  goldenWindows: { start: string; end: string }[];
  insight: string;
  status: {
    active: boolean;
    lastPollMinutesAgo: number | null;
  };
};
