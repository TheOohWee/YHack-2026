"use client";

import type { EnergySnapshot } from "@/types/energy";
import { InfoModal } from "./InfoModal";

type HeroMetricsProps = {
  snapshot: EnergySnapshot | null;
  priceCents: number | null;
  avg24h: number | null;
  loading: boolean;
};

/** Uses eco-efficiency z-score already stored on the latest log. */
function cleanScoreContextLabel(z: number | null | undefined): string | null {
  if (z == null || !Number.isFinite(z)) return null;
  if (z >= 0.75) return "Better than your last 3 days";
  if (z <= -2) return "Worst hour this week";
  if (z <= -0.5) return "Below your recent average";
  return "In line with your recent average";
}

export function HeroMetrics({
  snapshot,
  priceCents,
  avg24h,
  loading,
}: HeroMetricsProps) {
  const pct = snapshot ? Math.round(snapshot.dialPercent) : null;
  const saved = snapshot?.stats.total_dollars_saved ?? 0;
  const cleanLabel = cleanScoreContextLabel(snapshot?.ecoZScore);

  return (
    <section
      className="space-y-3"
      aria-labelledby="snapshot-heading"
    >
      <h2 id="snapshot-heading" className="text-xl font-semibold text-[var(--text)]">
        Today&apos;s snapshot
      </h2>
      <p className="max-w-2xl text-base text-[var(--text-muted)]">
        Three numbers that sum up how the grid looks for you right now.
      </p>
      <div className="flex flex-col gap-4 pt-2 lg:flex-row lg:gap-6">
        <article className="relative flex min-h-[140px] flex-1 flex-col justify-center rounded-[var(--radius-card)] border border-[var(--border-soft)] bg-[var(--surface)] px-6 py-6 shadow-[var(--shadow-card)]">
          <div className="absolute top-5 right-5">
            <InfoModal title="Current price">
              <p>The wholesale electricity price in your region right now, shown in cents per kilowatt-hour.</p>
              <p className="mt-3">The 24-hour average below it gives you a sense of whether the current price is higher or lower than usual.</p>
            </InfoModal>
          </div>
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

        <article className="relative flex min-h-[140px] flex-1 flex-col justify-center rounded-[var(--radius-card)] border border-[var(--border-soft)] bg-[var(--surface)] px-6 py-6 shadow-[var(--shadow-card)]">
          <div className="absolute top-5 right-5">
            <InfoModal title="Clean score">
              <p>A blended percentage combining how much of the grid is powered by renewables and how favorable the price is right now.</p>
              <p className="mt-3">Higher is better — it means cleaner, cheaper power is available.</p>
            </InfoModal>
          </div>
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
            {cleanLabel ?? "Renewables and price blended into one friendly index."}
          </p>
        </article>

        <article className="relative flex min-h-[140px] flex-1 flex-col justify-center rounded-[var(--radius-card)] border border-[var(--border-soft)] bg-[var(--surface)] px-6 py-6 shadow-[var(--shadow-card)]">
          <div className="absolute top-5 right-5">
            <InfoModal title="Estimated savings">
              <p>Cumulative dollar savings tracked over time based on your usage patterns and when you consumed power relative to price fluctuations.</p>
            </InfoModal>
          </div>
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
