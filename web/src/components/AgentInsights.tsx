"use client";

import { StatTooltip } from "./StatTooltip";

export function AgentInsights({
  text,
  ecoZScore,
  fromLlm,
}: {
  text: string;
  ecoZScore?: number | null;
  fromLlm?: boolean;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h2
          className="text-sm font-bold uppercase tracking-widest"
          style={{ color: "var(--text-secondary)", letterSpacing: "0.15em" }}
        >
          Guidance
        </h2>
        <span
          className="rounded-sm px-3 py-1 text-[10px] font-bold uppercase tracking-widest"
          style={{
            background: fromLlm ? "var(--accent-wash)" : "var(--surface-muted)",
            border: `1px solid ${fromLlm ? "var(--border-medium)" : "var(--border-soft)"}`,
            color: fromLlm ? "var(--accent)" : "var(--text-muted)",
          }}
        >
          {fromLlm ? "✦ AI Insight" : "General Tips"}
        </span>
        <StatTooltip tip="AI-generated or template guidance about your energy situation, based on live grid conditions. When the system has enough data, a personalized note from the LLM replaces the general tips." />
      </div>

      <p className="mb-4 text-xs" style={{ color: "var(--text-muted)" }}>
        {ecoZScore != null && Number.isFinite(ecoZScore) ? (
          <>
            Your recent clean-power balance sits{" "}
            <span className="font-bold tabular-nums" style={{ color: "var(--text-secondary)" }}>
              {ecoZScore.toFixed(2)}σ
            </span>{" "}
            from your usual pattern.
          </>
        ) : (
          "Plain language about savings and air quality — no jargon."
        )}
      </p>

      <div
        className="flex flex-1 rounded-sm px-5 py-5"
        style={{
          background: "var(--accent-wash)",
          border: "2px solid var(--border-medium)",
          boxShadow: "4px 4px 0 rgba(34,197,94,0.12)",
        }}
      >
        <p className="text-sm leading-relaxed" style={{ color: "var(--text)" }}>
          {text || (
            <span style={{ color: "var(--text-muted)" }}>
              Waiting for next reading<span className="blink">_</span>
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
