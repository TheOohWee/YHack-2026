"use client";

import { Leaf } from "lucide-react";

export function ImpactCounters({
  dollars,
  carbonKg,
}: {
  dollars: number;
  carbonKg: number;
}) {
  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <div className="flex flex-1 flex-col rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-muted)] px-5 py-5">
        <div className="flex items-center gap-2 text-[var(--text-secondary)]">
          <Leaf className="h-5 w-5 text-[var(--accent)]" aria-hidden />
          <span className="text-base font-medium">Carbon avoided</span>
        </div>
        <p className="mt-2 text-3xl font-semibold tabular-nums text-[var(--text)]">
          {carbonKg.toLocaleString(undefined, { maximumFractionDigits: 1 })} kg
        </p>
        <p className="mt-2 text-base text-[var(--text-muted)]">
          CO₂ not released when you time usage with cleaner power.
        </p>
        <p className="mt-4 border-t border-[var(--border-soft)] pt-4 text-base text-[var(--text-secondary)]">
          Savings recorded to date:{" "}
          <span className="font-semibold tabular-nums text-[var(--text)]">
            ${dollars.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </span>
        </p>
      </div>
      <div className="flex flex-1 flex-col justify-center rounded-2xl border border-[var(--border-soft)] bg-[var(--accent-wash)]/50 px-5 py-5">
        <p className="text-lg leading-relaxed text-[var(--text-secondary)]">
          Shifting even a little usage toward cleaner hours helps your bill and
          your neighborhood&apos;s air. Small moves add up.
        </p>
      </div>
    </div>
  );
}
