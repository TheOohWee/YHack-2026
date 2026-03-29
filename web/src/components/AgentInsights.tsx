"use client";

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
        {ecoZScore != null && Number.isFinite(ecoZScore) ? (
          <>
            Your recent clean-power balance sits about{" "}
            <span className="tabular-nums font-medium text-[var(--text-secondary)]">
              {ecoZScore.toFixed(2)}
            </span>{" "}
            from your usual pattern — here is what that can mean in plain
            language.
          </>
        ) : (
          <>
            Plain language about savings and air quality — no trading desk,
            no jargon.
          </>
        )}
      </p>
      <div className="flex flex-1 rounded-[var(--radius-card)] border border-[var(--accent-soft)]/60 bg-gradient-to-br from-[var(--accent-wash)]/80 to-[var(--surface)] px-5 py-6">
        <p className="text-lg leading-relaxed text-[var(--text)]">
          {text || "When we have your next reading, a short note will appear here."}
        </p>
      </div>
    </div>
  );
}
