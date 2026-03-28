"use client";

import type { EnergySnapshot } from "@/types/energy";

type HeroMetricsProps = {
  snapshot: EnergySnapshot | null;
  priceCents: number | null;
  avg24h: number | null;
  loading: boolean;
};

export function HeroMetrics({
  snapshot,
  priceCents,
  avg24h,
  loading,
}: HeroMetricsProps) {
  const pct = snapshot ? Math.round(snapshot.dialPercent) : null;
  const saved = snapshot?.stats.total_dollars_saved ?? 0;

  return (
    <section
      className="space-y-3"
      aria-labelledby="snapshot-heading"
    >
      <h2 id="snapshot-heading" className="text-xl font-semibold text-[var(--text)]">
        Today&apos;s snapshot
      </h2>
      <p className="max-w-2xl text-base text-[var(--text-muted)]">
        Three numbers that sum up how the grid looks for you right now. Tap
        sections below when you want more detail.
      </p>
      <div className="flex flex-col gap-4 pt-2 lg:flex-row lg:gap-6">
        <article className="flex min-h-[140px] flex-1 flex-col justify-center rounded-[var(--radius-card)] border border-[var(--border-soft)] bg-[var(--surface)] px-6 py-6 shadow-[var(--shadow-card)]">
          <h3 className="text-base font-medium text-[var(--text-secondary)]">
            Current price
          </h3>
          <p
            className="mt-2 text-4xl font-semibold tabular-nums tracking-tight text-[var(--text)]"
            aria-live="polite"
          >
            {loading && priceCents == null ? (
              <span className="text-[var(--text-muted)]">Loading…</span>
            ) : priceCents != null ? (
              <>
                {priceCents.toFixed(2)}
                <span className="ml-1 text-2xl font-medium text-[var(--text-secondary)]">
                  ¢ per kWh
                </span>
              </>
            ) : (
              <span className="text-[var(--text-muted)]">No reading yet</span>
            )}
          </p>
          <p className="mt-2 text-base text-[var(--text-muted)]">
            {avg24h != null
              ? `Past day average: ${avg24h.toFixed(2)}¢`
              : "Average fills in after more readings."}
          </p>
        </article>

        <article className="flex min-h-[140px] flex-1 flex-col justify-center rounded-[var(--radius-card)] border border-[var(--border-soft)] bg-[var(--surface)] px-6 py-6 shadow-[var(--shadow-card)]">
          <h3 className="text-base font-medium text-[var(--text-secondary)]">
            Clean score
          </h3>
          <p className="mt-2 text-4xl font-semibold tabular-nums text-[var(--text)]">
            {loading && !snapshot ? (
              <span className="text-[var(--text-muted)]">Loading…</span>
            ) : pct != null ? (
              <>{pct}%</>
            ) : (
              <span className="text-[var(--text-muted)]">—</span>
            )}
          </p>
          <p className="mt-2 text-base text-[var(--text-muted)]">
            Renewables and price blended into one friendly index.
          </p>
        </article>

        <article className="flex min-h-[140px] flex-1 flex-col justify-center rounded-[var(--radius-card)] border border-[var(--border-soft)] bg-[var(--surface)] px-6 py-6 shadow-[var(--shadow-card)]">
          <h3 className="text-base font-medium text-[var(--text-secondary)]">
            Estimated savings
          </h3>
          <p className="mt-2 text-4xl font-semibold tabular-nums text-[var(--accent)]">
            {loading && !snapshot ? (
              <span className="text-[var(--text-muted)]">Loading…</span>
            ) : (
              `$${saved.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
            )}
          </p>
          <p className="mt-2 text-base text-[var(--text-muted)]">
            Tracked over time from your usage patterns.
          </p>
        </article>
      </div>
    </section>
  );
}
