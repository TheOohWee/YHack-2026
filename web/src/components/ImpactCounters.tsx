"use client";

import { StatTooltip } from "./StatTooltip";

export function ImpactCounters({ dollars, carbonKg }: { dollars: number; carbonKg: number }) {
  return (
    <div className="flex flex-col gap-5 lg:flex-row">
      {/* Carbon avoided */}
      <div
        className="flex flex-1 flex-col rounded-sm px-5 py-5"
        style={{
          background: "var(--surface-muted)",
          border: "2px solid var(--border-soft)",
          boxShadow: "4px 4px 0 rgba(74,222,128,0.12)",
        }}
      >
        <div className="flex items-center gap-2">
          <span>🌱</span>
          <span
            className="text-[11px] font-bold uppercase tracking-widest flex-1"
            style={{ color: "var(--pastel-mint)", letterSpacing: "0.15em" }}
          >
            Carbon Avoided
          </span>
          <StatTooltip tip="Kilograms of CO₂ not released when you time your usage to coincide with cleaner (wind/solar) power hours. Calculated from grid carbon intensity at each polling window." />
        </div>
        <p
          className="mt-3 text-3xl font-bold tabular-nums text-glow"
          style={{ color: "var(--pastel-mint)" }}
        >
          {carbonKg.toLocaleString(undefined, { maximumFractionDigits: 1 })} kg
        </p>
        <p className="mt-1 text-[10px] uppercase" style={{ color: "var(--text-muted)" }}>
          CO₂ not released
        </p>

        {/* XP bar */}
        <div className="mt-4 xp-bar-track">
          <div
            className="xp-bar-fill"
            style={{ width: `${Math.min(100, carbonKg / 10)}%` }}
          />
        </div>

        <div
          className="mt-4 border-t pt-4 text-xs"
          style={{ borderColor: "var(--border-soft)", color: "var(--text-muted)" }}
        >
          Savings to date:{" "}
          <span className="font-bold" style={{ color: "var(--text-secondary)" }}>
            ${dollars.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Motivational card */}
      <div
        className="flex flex-1 flex-col justify-center rounded-sm px-5 py-5"
        style={{
          background: "var(--accent-wash)",
          border: "2px solid var(--border-medium)",
          boxShadow: "4px 4px 0 rgba(34,197,94,0.15)",
        }}
      >
        <p className="text-xs font-bold uppercase" style={{ color: "var(--accent)", letterSpacing: "0.15em" }}>
          ✦ WHY IT MATTERS
        </p>
        <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          Shifting even a little usage toward cleaner hours helps your bill and
          your neighborhood&apos;s air. Small moves add up — and they&apos;re tracked here.
        </p>
        <p className="mt-3 text-[10px] uppercase" style={{ color: "var(--text-muted)", letterSpacing: "0.12em" }}>
          Every kWh at the right time counts.
        </p>
      </div>
    </div>
  );
}
