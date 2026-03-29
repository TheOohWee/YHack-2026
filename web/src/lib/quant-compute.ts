import type { EnergyLogPoint } from "@/types/energy";

const HOUR_MS = 60 * 60 * 1000;

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

export function normalizeDialPercent(
  logs: EnergyLogPoint[],
  currentScore: number,
): number {
  const scores = logs
    .map((l) => l.eco_efficiency_score)
    .filter((s): s is number => typeof s === "number" && Number.isFinite(s));
  if (scores.length === 0) return 0;
  const min = Math.min(...scores, currentScore);
  const max = Math.max(...scores, currentScore);
  if (max <= min) return 75;
  return Math.min(100, Math.max(0, ((currentScore - min) / (max - min)) * 100));
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
