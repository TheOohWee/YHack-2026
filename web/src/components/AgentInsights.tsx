"use client";

import { displayScoreInt } from "@/lib/display-score";
import { parseInsightActions } from "@/lib/insight-actions";
import { useMemo } from "react";

export function AgentInsights({
  text,
  ecoZScore,
  fromLlm,
}: {
  text: string;
  ecoZScore?: number | null;
  fromLlm?: boolean;
}) {
  const cards = useMemo(() => parseInsightActions(text, 3), [text]);
  const ecoZInt = displayScoreInt(ecoZScore);

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-semibold text-[var(--text)]">
          Guidance for your week
        </h2>
        <span
          className={`rounded-full px-3 py-1 text-sm font-medium ${
            fromLlm
              ? "bg-[var(--accent-wash)] text-[var(--accent)]"
              : "bg-[var(--surface-muted)] text-[var(--text-muted)]"
          }`}
        >
          {fromLlm ? "Personalized note" : "General tips"}
        </span>
      </div>
      <p className="mb-4 text-base text-[var(--text-muted)]">
        {ecoZInt != null ? (
          <>
            Your recent clean-power balance sits about{" "}
            <span className="tabular-nums font-medium text-[var(--text-secondary)]">
              {ecoZInt}
            </span>{" "}
            standard deviations from your usual pattern — here are focused
            moves you can try.
          </>
        ) : (
          <>
            Plain language savings ideas — no trading desk, no heavy jargon.
          </>
        )}
      </p>

      {cards.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {cards.map((c, i) => (
            <li
              key={i}
              className="flex flex-col gap-2 rounded-[var(--radius-card)] border border-[var(--accent-soft)]/70 bg-gradient-to-br from-[var(--accent-wash)]/90 to-[var(--surface)] px-4 py-4 shadow-[var(--shadow-card)] sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex gap-3 text-base font-medium leading-snug text-[var(--text)]">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/15 text-sm font-semibold text-[var(--accent)]">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1">{c.text}</span>
              </div>
              {c.savingsLabel ? (
                <span className="shrink-0 self-start rounded-full border border-[var(--accent-soft)] bg-[var(--surface)] px-3 py-1.5 text-sm font-semibold tabular-nums text-[var(--accent)] sm:self-center">
                  Est. {c.savingsLabel}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-1 rounded-[var(--radius-card)] border border-[var(--accent-soft)]/60 bg-gradient-to-br from-[var(--accent-wash)]/80 to-[var(--surface)] px-5 py-6">
          <p className="text-base leading-relaxed text-[var(--text)]">
            {text ||
              "When we have your next reading, a short note will appear here."}
          </p>
        </div>
      )}
    </div>
  );
}
