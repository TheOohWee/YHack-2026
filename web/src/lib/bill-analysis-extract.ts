/**
 * K2 Think may emit ` </think> ` blocks and plain-text chain-of-thought.
 * Reduce streamed or full responses to user-facing bill summary + Suggestions only.
 */

const THINK_OPEN = "<think>";
const THINK_CLOSE = "</think>";

export function stripThinkBlocks(raw: string): string {
  let s = raw;
  while (true) {
    const open = s.indexOf(THINK_OPEN);
    if (open === -1) break;
    const close = s.indexOf(THINK_CLOSE, open + THINK_OPEN.length);
    if (close === -1) {
      s = s.slice(0, open);
      break;
    }
    s =
      s.slice(0, open) + s.slice(close + THINK_CLOSE.length);
  }
  return s.trim();
}

/**
 * Split ` ` for K2 Think V2 / Lava / o1-style models: log reasoning to the server console
 * (hackathon demo / ops), return only the assistant text after the closing tag.
 *
 * @param logLabel - e.g. distinguish bill extraction vs chat in `wattsup-serve` / Next logs
 */
export function logK2ReasoningReturnFinal(
  raw: string,
  logLabel = "[K2V2 reasoning - not sent to user]"
): string {
  if (!raw) return raw;
  const idx = raw.indexOf(THINK_CLOSE);
  if (idx !== -1) {
    const thought = raw.slice(0, idx).replace(THINK_OPEN, "").trim();
    const final = raw.slice(idx + THINK_CLOSE.length).trim();
    if (thought) {
      console.log(`${logLabel}\n${thought}\n`);
    }
    if (final) return final;
  }
  return stripThinkBlocks(raw);
}

function isReasoningParagraph(p: string): boolean {
  const t0 = p.trim();
  if (/^now we need to\b/i.test(t0)) return true;
  if (/^we need to ensure\b/i.test(t0)) return true;
  const s = p.toLowerCase();
  if (s.length < 20) return false;
  if (s.includes("the instruction says")) return true;
  if (s.includes("let's parse")) return true;
  if (s.includes("we need to extract")) return true;
  if (s.includes("we need to produce")) return true;
  if (s.includes("we need to read the electricity bill")) return true;
  if (s.includes("have a fairly messy bill")) return true;
  if (s.includes("the extracted text includes")) return true;
  if (s.includes("formatting rules")) return true;
  if (s.includes("length and tone")) return true;
  if (s.includes("example shape")) return true;
  if (s.includes("now produce")) return true;
  if (s.includes("now we need")) return true;
  if (s.includes("check if")) return true;
  if (s.includes("potential bullet")) return true;
  if (s.includes("accuracy:") && s.includes("never invent")) return true;
  if (s.startsWith("- ") && s.includes("no markdown")) return true;
  if (s.includes("do not use markdown")) return true;
  if (s.includes("your entire reply must")) return true;
  if (s.includes("reply in plain text only") && s.includes("one short paragraph"))
    return true;
  if (s.includes("cover:") && s.includes("billing period")) return true;
  if (/^(thus|now)[,.]?\s*final answer\.?$/i.test(s.trim())) return true;
  if (/^final answer:?\s*$/i.test(s.trim())) return true;
  if (s.length < 90 && /\bfinal answer\.?\s*$/i.test(s) && /^(now|thus|so|therefore|here)\b/i.test(s))
    return true;
  /** Echoed self-instructions / formatting meta (not bill content). */
  if (/plain ascii/i.test(s)) return true;
  if (/stray characters/i.test(s)) return true;
  if (/^now ensure\b/i.test(s)) return true;
  if (/^ensure we\b/i.test(s) && /characters|ascii|unicode|formatting/i.test(s)) return true;
  if (/^use plain\b/i.test(s)) return true;
  /** Model "verification" monologue after the real answer */
  if (/^now we need to ensure\b/i.test(s)) return true;
  if (/^we need to ensure\b/i.test(s)) return true;
  if (/^the summary paragraph\b/i.test(s)) return true;
  if (/^yes, we have\b/i.test(s)) return true;
  if (/^we have \d+ lines\b/i.test(s)) return true;
  if (/^now we need to\b/i.test(s) && /ensure|lines|markdown|ascii|hyphen|stray/i.test(s))
    return true;
  return false;
}

/** K2 often appends a long "Now we need to ensure..." checklist after Suggestions — cut it off. */
function truncateAtPostAnswerMeta(s: string): string {
  // Try double-newline first (paragraph break), then single newline (after last bullet line).
  const patterns: RegExp[] = [
    /\n\r?\nNow we need to ensure\b/i,
    /\n\r?\nNow we need to\b/i,
    /\n\r?\nWe need to ensure\b/i,
    /\n\r?\nThe summary paragraph\b/i,
    /\n\r?\nYes, we have\b/i,
    /\n\r?\nWe have \d+ lines\b/i,
    /\nNow we need to ensure\b/i,
    /\nNow we need to\b/i,
    /\nWe need to ensure\b/i,
    /\nThe summary paragraph\b/i,
    /\nYes, we have\b/i,
  ];
  let out = s;
  for (const re of patterns) {
    const m = re.exec(out);
    if (m && m.index !== undefined) {
      out = out.slice(0, m.index).trim();
      break;
    }
  }
  return out;
}

/** Keep only "Suggestions:" + bullet lines; drop trailing self-verification paragraphs. */
function trimSuggestionsSection(sug: string): string {
  const lines = sug.split(/\r?\n/);
  const out: string[] = [];
  let pastHeader = false;
  for (const line of lines) {
    const t = line.trim();
    if (!pastHeader) {
      out.push(line);
      if (/^Suggestions:\s*$/i.test(t)) pastHeader = true;
      continue;
    }
    if (!t) {
      out.push(line);
      continue;
    }
    if (isReasoningParagraph(t) || /^now we need\b/i.test(t) || /^we need to ensure\b/i.test(t))
      break;
    if (/^-\s/.test(t) || /^Suggestions:/i.test(t)) {
      out.push(line);
      continue;
    }
    // Non-bullet after bullets = likely rambling (e.g. "Good." or prose)
    if (out.some((l) => /^-\s/.test(l.trim()))) break;
    out.push(line);
  }
  return out.join("\n").replace(/\n+$/, "").trim();
}

const META_PREFIX_WORDS = "(?:Now|Thus|So|Therefore|Here)";

/** Single line that is only model meta (short). */
function isMetaOnlyLine(line: string): boolean {
  const t = line.trim();
  if (!t || t.length > 220) return false;
  if (/^final answer:?\s*$/i.test(t)) return true;
  if (new RegExp(`^${META_PREFIX_WORDS}\\b[,.'\\s]*final answer\\.?\\s*$`, "i").test(t))
    return true;
  if (/plain ascii/i.test(t) && /ensure|stray|characters|unicode/i.test(t)) return true;
  if (/^now ensure\b/i.test(t)) return true;
  if (/^use plain ascii\.?$/i.test(t)) return true;
  return false;
}

/** Drop leading lines that are only "Now final answer."-style junk. */
function stripLeadingMetaLines(s: string): string {
  const lines = s.split(/\r?\n/);
  while (lines.length > 0) {
    const line = lines[0]!.trim();
    if (!line) {
      lines.shift();
      continue;
    }
    if (isMetaOnlyLine(line)) {
      lines.shift();
      continue;
    }
    break;
  }
  return lines.join("\n").trim();
}

/** Plain ASCII for UI + copy/paste: common unicode punctuation from models. */
export function normalizeBillTextToAscii(s: string): string {
  return (
    s
      .replace(/\uFEFF/g, "")
      .replace(/\u2014/g, "-")
      .replace(/\u2013/g, "-")
      .replace(/\u2011/g, "-")
      .replace(/\u2212/g, "-")
      .replace(/\u00A0/g, " ")
      .replace(/\u202F/g, " ")
      .replace(/\u2009/g, " ")
      .replace(/[\u2018\u2019\u2032]/g, "'")
      .replace(/[\u201C\u201D\u2033]/g, '"')
      .replace(/\u2022/g, "-")
      .replace(/\u00B7/g, "-")
      .replace(/\u00A2/g, "c")
  );
}

/** Remove model meta the model still emits before the real summary paragraph. */
function stripSummaryMetaPrefixes(summary: string): string {
  let s = summary.trim();
  for (let n = 0; n < 6; n++) {
    const before = s;
    const reWord = META_PREFIX_WORDS;
    // Own line or same line before the real summary
    s = s.replace(
      new RegExp(
        `^\\s*${reWord}\\b[,.'\\s]*final answer\\.?\\s*[\\n\\r]*`,
        "i"
      ),
      ""
    );
    s = s.replace(
      new RegExp(`^\\s*${reWord}\\b[,.'\\s]+final answer\\.?\\s+`, "i"),
      ""
    );
    s = s.replace(/^\s*Final answer:?\s*[\n\r]*/i, "");
    s = s.replace(/^\s*Final answer:?\s+/i, "");
    s = s.replace(/^\s*Answer:?\s*[\n\r]*/i, "");
    s = s.replace(/^\s*Answer:?\s+/i, "");
    s = s.replace(/^\s*In conclusion[,.\s]+/i, "");
    s = stripLeadingMetaLines(s);
    s = s.trim();
    if (s === before) break;
  }
  return s;
}

/**
 * Keep the summary paragraph(s) plus the Suggestions block; drop echoed prompts and CoT.
 */
export function extractBillUserFacingText(raw: string): string {
  let t = normalizeBillTextToAscii(stripThinkBlocks(raw).trim());
  if (!t) return t;
  // Meta line sometimes appears before the whole answer block
  t = stripLeadingMetaLines(t);
  t = stripSummaryMetaPrefixes(t);

  const idxNl = t.lastIndexOf("\nSuggestions:");
  const idxPlain = t.lastIndexOf("Suggestions:");
  let sugStart = idxNl !== -1 ? idxNl + 1 : idxPlain;
  if (sugStart === -1) {
    const paras = t
      .split(/\n\s*\n/)
      .map((x) => x.trim())
      .filter(Boolean);
    const kept = paras.filter((p) => !isReasoningParagraph(p));
    return truncateAtPostAnswerMeta(
      stripSummaryMetaPrefixes(kept.join("\n\n").trim() || t)
    );
  }

  const before = t.slice(0, sugStart).trim();
  let suggestionsPart = trimSuggestionsSection(t.slice(sugStart).trim());
  suggestionsPart = truncateAtPostAnswerMeta(suggestionsPart);

  const paras = before
    .split(/\n\s*\n/)
    .map((x) => x.trim())
    .filter(Boolean);

  let summary = "";
  for (let i = paras.length - 1; i >= 0; i--) {
    const p = paras[i]!;
    if (!isReasoningParagraph(p) && p.length > 35) {
      summary = p;
      break;
    }
  }
  if (!summary) {
    const kept = paras.filter((p) => !isReasoningParagraph(p));
    if (kept.length) summary = kept[kept.length - 1]!;
    else if (paras.length) summary = paras[paras.length - 1]!;
  }

  summary = stripSummaryMetaPrefixes(summary);

  if (!summary?.trim()) return truncateAtPostAnswerMeta(suggestionsPart.trim());
  const merged = `${summary}\n\n${suggestionsPart}`.trim();
  return truncateAtPostAnswerMeta(merged);
}
