/**
 * UI-only integer scores: Number() then Math.round.
 * Returns null for null/undefined or non-finite values (no accidental 0 from null).
 */
export function displayScoreInt(value: unknown): number | null {
  if (value == null) return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.round(n);
}
