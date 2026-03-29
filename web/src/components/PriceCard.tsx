"use client";

import { StatTooltip } from "./StatTooltip";

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
  const borderColor = pulseAmber ? "var(--warn-border)" : "var(--border-soft)";
  const bgColor = pulseAmber ? "var(--warn-bg)" : "var(--surface-card)";

  return (
    <div
      className="rounded-sm px-5 py-5"
      style={{
        background: bgColor,
        border: `2px solid ${borderColor}`,
        boxShadow: pulseAmber
          ? "4px 4px 0 rgba(184,134,11,0.20)"
          : "var(--shadow-card)",
      }}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        {/* Left — live price */}
        <div className="flex items-start gap-3">
          <span className="mt-0.5 text-xl">
            {pulseAmber ? "⚠️" : "⚡"}
          </span>
          <div>
            <div className="flex items-center gap-1">
              <p
                className="text-[11px] font-bold uppercase tracking-widest"
                style={{ color: pulseAmber ? "var(--warn)" : "var(--text-secondary)", letterSpacing: "0.15em" }}
              >
                Live Reference Price
              </p>
              <StatTooltip tip="The current electricity spot price in cents per kWh. This is the raw grid price — your bill may differ by provider. Compared against your 24h history to gauge whether now is expensive." />
            </div>
            <p
              className="mt-1 text-3xl font-bold tabular-nums"
              style={{ color: pulseAmber ? "var(--warn)" : "var(--pastel-sky)" }}
            >
              {priceCents != null ? `${priceCents.toFixed(2)}¢` : "—"}
              <span className="ml-2 text-base font-normal" style={{ color: "var(--text-muted)" }}>
                per kWh
              </span>
            </p>
          </div>
        </div>

        {/* Right — 24h stats */}
        <div className="text-[11px] sm:text-right space-y-1">
          <div className="flex items-center justify-end gap-1">
            <p style={{ color: "var(--text-muted)" }}>
              24-hr avg:{" "}
              <span className="font-bold tabular-nums" style={{ color: "var(--text-secondary)" }}>
                {avg24h != null ? `${avg24h.toFixed(2)}¢` : "—"}
              </span>
            </p>
          </div>
          <div className="flex items-center justify-end gap-1">
            <p style={{ color: "var(--text-muted)" }}>
              Z-score:{" "}
              <span className="font-bold tabular-nums" style={{ color: "var(--text-secondary)" }}>
                {zScore != null ? zScore.toFixed(2) : "—"}
              </span>
            </p>
            <StatTooltip tip="How many standard deviations the current price sits above or below the 24h mean. Z > 2 triggers a high-price alert. Z < -1 means unusually cheap — great time to run the dishwasher!" />
          </div>
        </div>
      </div>

      {/* Alert message */}
      {pulseAmber ? (
        <p
          className="mt-4 text-xs uppercase"
          style={{ color: "var(--warn)", letterSpacing: "0.06em" }}
        >
          ⚠ PRICE SPIKE DETECTED — consider delaying large appliances until tonight or tomorrow.
        </p>
      ) : (
        <p className="mt-4 text-[11px]" style={{ color: "var(--text-muted)" }}>
          Prices look typical for the last day of readings.
        </p>
      )}
    </div>
  );
}
