"use client";

import { displayScoreInt } from "@/lib/display-score";
import { Zap } from "lucide-react";

export function PriceCard({
  priceCents,
  avg24h,
  pulseAmber,
  zScore,
}: {
  priceCents: number | null;
  avg24h: number | null;
  pulseAmber: boolean;
  zScore: number | null;
}) {
  const zInt = displayScoreInt(zScore);
  return (
    <div
      className={`rounded-[var(--radius-card)] border px-5 py-5 transition-shadow ${
        pulseAmber
          ? "border-[var(--warm-alert)]/35 bg-[var(--warm-alert-bg)]"
          : "border-[var(--border-soft)] bg-[var(--surface-muted)]"
      }`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Zap
            className={`mt-1 h-5 w-5 shrink-0 ${
              pulseAmber ? "text-[var(--warm-alert)]" : "text-[var(--accent)]"
            }`}
            aria-hidden
          />
          <div>
            <p className="text-base font-medium text-[var(--text-secondary)]">
              Live reference price
            </p>
            <p className="mt-1 text-3xl font-semibold tabular-nums text-[var(--text)]">
              {priceCents != null ? `${priceCents.toFixed(2)}¢` : "—"}{" "}
              <span className="text-lg font-medium text-[var(--text-muted)]">
                per kWh
              </span>
            </p>
          </div>
        </div>
        <div className="text-base text-[var(--text-muted)] sm:text-right">
          <p>
            24-hour average:{" "}
            <span className="tabular-nums text-[var(--text)]">
              {avg24h != null ? `${avg24h.toFixed(2)}¢` : "—"}
            </span>
          </p>
          <p className="mt-1">
            Compared with recent window:{" "}
            <span className="tabular-nums text-[var(--text)]">
              {zInt != null ? zInt : "—"}
            </span>
          </p>
        </div>
      </div>
      {pulseAmber ? (
        <p className="mt-4 text-base text-[var(--text-secondary)]">
          Prices are a bit higher than usual today. If you can wait on large
          appliances, tonight or tomorrow may be gentler on your bill.
        </p>
      ) : (
        <p className="mt-4 text-base text-[var(--text-muted)]">
          Prices look typical for the last day of readings.
        </p>
      )}
    </div>
  );
}
