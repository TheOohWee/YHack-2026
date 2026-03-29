"use client";

import type { EnergySnapshot } from "@/types/energy";
import { StatTooltip } from "./StatTooltip";

type HeroMetricsProps = {
  snapshot: EnergySnapshot | null;
  priceCents: number | null;
  avg24h: number | null;
  loading: boolean;
};

type StatCardProps = {
  title: string;
  icon: string;
  value: string;
  unit?: string;
  sub: string;
  barPct: number;
  accentColor: string;
  glowClass?: string;
  tooltip: string;
  loading: boolean;
};

function StatCard({
  title,
  icon,
  value,
  unit,
  sub,
  barPct,
  accentColor,
  glowClass = "",
  tooltip,
  loading,
}: StatCardProps) {
  const clamped = Math.min(100, Math.max(0, barPct));

  return (
    <article
      className="card-pixel flex min-h-[200px] flex-1 flex-col gap-3 px-6 py-5"
      style={{ borderColor: accentColor }}
    >
      <div className="flex items-center gap-2">
        <span className="text-base">{icon}</span>
        <h3
          className="flex-1 text-[11px] font-bold uppercase tracking-widest"
          style={{ color: accentColor, letterSpacing: "0.15em" }}
        >
          {title}
        </h3>
        <StatTooltip tip={tooltip} />
      </div>

      <div className="flex items-baseline gap-2">
        <p
          className={`text-4xl font-bold leading-none tabular-nums ${glowClass}`}
          style={{ color: accentColor }}
          aria-live="polite"
        >
          {loading && value === "—" ? (
            <span className="text-xl" style={{ color: "var(--text-muted)" }}>
              LOADING<span className="blink">_</span>
            </span>
          ) : (
            value
          )}
        </p>

        {unit ? (
          <span className="text-sm" style={{ color: "var(--text-muted)" }}>
            {unit}
          </span>
        ) : null}
      </div>

      <div className="xp-bar-track">
        <div
          className="xp-bar-fill"
          style={{
            width: `${clamped}%`,
            background: accentColor,
            opacity: 0.85,
          }}
        />
      </div>

      <p
        className="text-[10px] uppercase tracking-widest"
        style={{ color: "var(--text-muted)" }}
      >
        {sub}
      </p>
    </article>
  );
}

export function HeroMetrics({
  snapshot,
  priceCents,
  avg24h,
  loading,
}: HeroMetricsProps) {
  const pct = snapshot ? Math.round(snapshot.dialPercent) : null;
  const saved = snapshot?.stats.total_dollars_saved ?? 0;

  const priceValue = priceCents != null ? priceCents.toFixed(2) : "—";
  const priceSub =
    avg24h != null
      ? `Past day average: ${avg24h.toFixed(2)}¢`
      : "Average fills in after more readings.";
  const priceBar =
    avg24h != null && priceCents != null
      ? Math.min(100, Math.round((priceCents / (avg24h * 2)) * 100))
      : 50;

  const cleanValue = pct != null ? `${pct}%` : "—";
  const cleanBar = pct ?? 0;

  const savingsValue = loading && !snapshot
    ? "—"
    : `$${saved.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  const savingsBar = Math.min(100, saved * 10);

  return (
    <section className="space-y-4" aria-labelledby="snapshot-heading">
      <div>
        <h2
          id="snapshot-heading"
          className="text-xl font-semibold text-[var(--text)]"
        >
          Today&apos;s snapshot
        </h2>
        <p className="max-w-2xl text-base text-[var(--text-muted)]">
          Three numbers that sum up how the grid looks for you right now.
        </p>
      </div>

      <div className="flex flex-col gap-4 pt-2 lg:flex-row lg:gap-5">
        <StatCard
          title="Current Price"
          icon="⚡"
          value={priceValue}
          unit="¢/kWh"
          sub={priceSub}
          barPct={priceBar}
          accentColor="var(--pastel-sky)"
          glowClass="text-glow-pastel-sky"
          tooltip="The wholesale electricity price in your region right now, shown in cents per kilowatt-hour. The past-day average helps you judge whether the current price is higher or lower than usual."
          loading={loading}
        />

        <StatCard
          title="Clean Score"
          icon="🌿"
          value={cleanValue}
          sub="RENEWABLES + PRICE INDEX"
          barPct={cleanBar}
          accentColor="var(--pastel-mint)"
          glowClass="text-glow"
          tooltip="A blended percentage combining how much of the grid is powered by renewables and how favorable the price is right now. Higher is better — it means cleaner, cheaper power is more available."
          loading={loading}
        />

        <StatCard
          title="Estimated Savings"
          icon="💰"
          value={savingsValue}
          sub="TRACKED OVER TIME"
          barPct={savingsBar}
          accentColor="var(--pastel-yellow)"
          glowClass="text-glow-pastel-yellow"
          tooltip="Cumulative dollar savings tracked over time based on your usage patterns and when you consumed power relative to price fluctuations."
          loading={loading}
        />
      </div>
    </section>
  );
}