import type { EnergyLogPoint } from "@/types/energy";

const HOUR_MS = 60 * 60 * 1000;

const FUEL_MIX_KEYS: (keyof Pick<
  EnergyLogPoint,
  | "nuclear"
  | "coal"
  | "natural_gas"
  | "wind"
  | "solar"
  | "battery_storage"
  | "imports"
  | "other"
>)[] = [
  "nuclear",
  "coal",
  "natural_gas",
  "wind",
  "solar",
  "battery_storage",
  "imports",
  "other",
];

/**
 * Rescale granular fuel shares so they sum to 100% for stacked charts / tooltips.
 * Preserves non-fuel fields (price, timestamps, scores). Clamps each segment to [0, 100].
 */
export function normalizeFuelMixPointForDisplay(l: EnergyLogPoint): EnergyLogPoint {
  const raw = FUEL_MIX_KEYS.map((k) => {
    const v = l[k];
    return typeof v === "number" && Number.isFinite(v) ? Math.max(0, v) : 0;
  });
  const sum = raw.reduce((a, b) => a + b, 0);
  if (sum <= 0) {
    const cleared = { ...l };
    for (const k of FUEL_MIX_KEYS) cleared[k] = 0;
    return cleared;
  }
  const scale = 100 / sum;
  const scaled = raw.map((v) => v * scale);
  const total = scaled.reduce((a, b) => a + b, 0);
  const drift = 100 - total;
  if (Math.abs(drift) > 1e-12) {
    let maxI = 0;
    for (let i = 1; i < scaled.length; i++) {
      if (scaled[i]! > scaled[maxI]!) maxI = i;
    }
    scaled[maxI] = Math.min(100, Math.max(0, scaled[maxI]! + drift));
  }
  const out = { ...l };
  for (let i = 0; i < FUEL_MIX_KEYS.length; i++) {
    const k = FUEL_MIX_KEYS[i]!;
    out[k] = Math.min(100, Math.max(0, scaled[i]!));
  }
  return out;
}

/**
 * For charts: keep the most recent point, then walk backward and only keep a point
 * if it is at least `minGapMs` older than the last kept point (reduces stacked/overdense polls).
 */
export function decimateLogsByTimeGap(
  logs: EnergyLogPoint[],
  minGapMs: number = HOUR_MS,
): EnergyLogPoint[] {
  if (logs.length <= 1) return [...logs];
  const byDesc = [...logs].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
  const kept: EnergyLogPoint[] = [byDesc[0]!];
  for (let i = 1; i < byDesc.length; i++) {
    const p = byDesc[i]!;
    const last = kept[kept.length - 1]!;
    const tLast = new Date(last.timestamp).getTime();
    const tP = new Date(p.timestamp).getTime();
    if (!Number.isFinite(tLast) || !Number.isFinite(tP)) continue;
    if (tLast - tP >= minGapMs) {
      kept.push(p);
    }
  }
  return kept.reverse();
}

function meanStd(values: number[]): { mean: number; std: number } | null {
  if (values.length < 2) return null;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const v =
    values.reduce((s, x) => s + (x - mean) ** 2, 0) / (values.length - 1);
  const std = Math.sqrt(v);
  if (std === 0) return { mean, std: 0 };
  return { mean, std };
}

/** Sample z-score of latest price vs 24h window. */
export function priceZScoreFromLogs(
  logs: EnergyLogPoint[],
  latestPrice: number,
): number | null {
  const prices = logs.map((l) => l.price_cents).filter(Number.isFinite);
  const ms = meanStd(prices);
  if (!ms || ms.std === 0) return null;
  return (latestPrice - ms.mean) / ms.std;
}

/** When Mongo has no eco-efficiency history yet, blend renewables share vs price (ComEd-scale ¢). */
export function heuristicTimingCleanPercent(
  point: EnergyLogPoint | null,
): number {
  if (!point) return 0;
  const ren = Math.min(
    100,
    Math.max(
      0,
      point.renewable_pct ??
        point.wind +
          point.solar +
          point.battery_storage,
    ),
  );
  const p = point.price_cents;
  if (!Number.isFinite(p) || p <= 0) {
    return Math.round(Math.min(100, Math.max(0, ren)));
  }
  const priceScore = Math.min(
    100,
    Math.max(0, ((20 - p) / (20 - 2.5)) * 100),
  );
  return Math.round(
    Math.min(100, Math.max(0, 0.58 * ren + 0.42 * priceScore)),
  );
}

/**
 * Eco-efficiency scores for log rows that have a numeric score (Mongo / driver-safe).
 */
function ecoScoresFromLogs(logs: EnergyLogPoint[]): number[] {
  return logs
    .map((l) => l.eco_efficiency_score)
    .filter((s): s is number => typeof s === "number" && Number.isFinite(s));
}

/**
 * Dial fill: current poll vs **average** of your other recent polls (24h window).
 * 100% means this reading is at or above your rolling average; lower means below average.
 * When eco scores are missing, uses renewable % + price heuristic from the latest row.
 */
export function normalizeDialPercent(
  logs: EnergyLogPoint[],
  currentEcoScore: number | null,
  latest: EnergyLogPoint | null,
): number {
  const cur =
    currentEcoScore != null && Number.isFinite(currentEcoScore)
      ? currentEcoScore
      : null;

  let baselineScores = ecoScoresFromLogs(logs);

  if (
    latest &&
    logs.length > 0 &&
    baselineScores.length > 1 &&
    logs[logs.length - 1]!.timestamp === latest.timestamp
  ) {
    baselineScores = baselineScores.slice(0, -1);
  }

  if (baselineScores.length > 0 && cur != null) {
    const sum = baselineScores.reduce((a, b) => a + b, 0);
    const avg = sum / baselineScores.length;
    if (avg > 0) {
      const vsAvg = (cur / avg) * 100;
      return Math.round(Math.min(100, Math.max(0, vsAvg)));
    }
  }

  if (baselineScores.length > 1 && cur == null) {
    const tail = baselineScores[baselineScores.length - 1]!;
    const sumRest = baselineScores.slice(0, -1).reduce((a, b) => a + b, 0);
    const avg = sumRest / (baselineScores.length - 1);
    if (avg > 0) {
      const vsAvg = (tail / avg) * 100;
      return Math.round(Math.min(100, Math.max(0, vsAvg)));
    }
  }

  if (cur != null && baselineScores.length === 0) {
    return heuristicTimingCleanPercent(latest);
  }

  return heuristicTimingCleanPercent(latest);
}

export function findGoldenWindows(logs: EnergyLogPoint[]): {
  start: string;
  end: string;
}[] {
  if (logs.length === 0) return [];
  const prices = logs.map((l) => l.price_cents).sort((a, b) => a - b);
  const mid = prices[Math.floor(prices.length / 2)] ?? prices[0];
  const marked = logs.map((l) => ({
    t: l.timestamp,
    ok:
      (l.renewable_pct ??
        l.wind + l.solar + l.battery_storage) > 60 &&
      l.price_cents < mid,
  }));
  const windows: { start: string; end: string }[] = [];
  let start: string | null = null;
  let prev: string | null = null;
  for (const row of marked) {
    if (row.ok) {
      if (start === null) start = row.t;
      prev = row.t;
    } else {
      if (start !== null && prev !== null) {
        windows.push({ start, end: prev });
      }
      start = null;
      prev = null;
    }
  }
  if (start !== null && prev !== null) windows.push({ start, end: prev });
  return windows;
}
