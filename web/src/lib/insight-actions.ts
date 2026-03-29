export type InsightActionCard = {
  /** Short actionable line (no leading number). */
  text: string;
  /** Estimated savings e.g. "~$8/mo" or null if unknown. */
  savingsLabel: string | null;
};

const SAVINGS_PATTERNS = [
  /~\s*\$[\d,]+(?:\.\d{1,2})?\s*(?:\/mo|\/month|\/yr|\/year)?/i,
  /\$[\d,]+(?:\.\d{1,2})?\s*(?:\/mo|\/month)/i,
  /save\s*(?:~)?\s*\$[\d,]+(?:\.\d{1,2})?/i,
];

function extractSavings(line: string): string | null {
  for (const p of SAVINGS_PATTERNS) {
    const m = line.match(p);
    if (!m) continue;
    let s = m[0].replace(/^save\s*/i, "").trim();
    if (!s.startsWith("~") && /\$/.test(s)) s = `~${s.replace(/^~/, "")}`;
    return s;
  }
  return null;
}

function stripNumberPrefix(line: string): string {
  return line
    .replace(/^\s*\d+[\s.):-]+/i, "")
    .replace(/^\s*[-*•]+\s*/, "")
    .trim();
}

/**
 * Pull up to `max` actionable bullets from LLM / numbered-list style insight text.
 */
export function parseInsightActions(
  raw: string,
  max: number = 3,
): InsightActionCard[] {
  const text = (raw || "").trim();
  if (!text) return [];

  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const candidates: string[] = [];

  for (const line of lines) {
    if (/^\s*\d+[\s.)]/.test(line) || /^\s*[-*•]\s+/.test(line)) {
      const body = stripNumberPrefix(line);
      if (body.length > 12) candidates.push(body);
    }
  }

  if (candidates.length === 0) {
    const sentences = text
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 20 && s.length < 280);
    for (const s of sentences.slice(0, max)) {
      candidates.push(s);
    }
  }

  const out: InsightActionCard[] = [];
  for (const line of candidates) {
    if (out.length >= max) break;
    const savingsLabel = extractSavings(line);
    let t = line;
    for (const p of SAVINGS_PATTERNS) t = t.replace(p, "");
    t = t.replace(/\s*[—–-]\s*$/, "").trim();
    t = t.replace(/\s*[,;]\s*$/, "").trim();
    if (t.length < 10) continue;
    out.push({ text: t, savingsLabel });
  }

  return out.slice(0, max);
}
