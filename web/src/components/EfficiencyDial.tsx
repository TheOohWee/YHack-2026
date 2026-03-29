"use client";

import type { EnergySnapshot } from "@/types/energy";
import {
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
} from "recharts";
import { StatTooltip } from "./StatTooltip";

const FILL = "#5a8f6a";
const TRACK = "#e5e1d9";

export function EfficiencyDial({ snapshot }: { snapshot: EnergySnapshot }) {
  const pct = Math.round(snapshot.dialPercent);
  const score = snapshot.latest?.eco_efficiency_score ?? 0;
  const data = [{ name: "efficiency", value: pct, fill: FILL }];

  return (
    <div className="relative flex h-full min-h-[260px] flex-col rounded-xl">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-[var(--text)]">
            How clean was your timing?
          </h2>
          <StatTooltip tip="A 0–100% score showing how your current eco-efficiency compares with your recent range. Higher means cleaner and/or cheaper timing relative to your own recent data." />
        </div>

        <span className="rounded-full bg-[var(--accent-wash)] px-3 py-1 text-sm font-medium text-[var(--accent)]">
          Your blend
        </span>
      </div>

      <p className="mb-4 text-base text-[var(--text-muted)]">
        We combine renewables and price into one score so you can see progress
        at a glance.
        {snapshot.ecoZScore != null ? (
          <>
            {" "}
            Compared with your recent days:{" "}
            <span className="tabular-nums text-[var(--text-secondary)]">
              {snapshot.ecoZScore.toFixed(2)}
            </span>
            <span className="ml-2 inline-flex align-middle">
              <StatTooltip tip="Standard deviations from your recent eco-efficiency baseline. Positive means cleaner than usual, negative means dirtier, and zero means close to your average." />
            </span>
            .
          </>
        ) : null}
      </p>

      <div className="relative flex flex-1 items-center justify-center">
        <ResponsiveContainer width="100%" height={220}>
          <RadialBarChart
            innerRadius="58%"
            outerRadius="100%"
            data={data}
            startAngle={90}
            endAngle={-270}
            cx="50%"
            cy="50%"
          >
            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
            <RadialBar
              background={{ fill: TRACK }}
              dataKey="value"
              cornerRadius={10}
              animationDuration={600}
            />
          </RadialBarChart>
        </ResponsiveContainer>

        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <p className="text-4xl font-semibold tabular-nums text-[var(--text)]">
              {pct}%
            </p>
            <p className="mt-1 text-2xl font-medium tabular-nums text-[var(--accent)]">
              {score >= 1000 ? score.toExponential(2) : score.toFixed(1)}
            </p>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Detail index
            </p>
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-[10px] uppercase text-[var(--text-muted)]">
        <span>0%</span>
        <span className="text-[var(--accent)]">
          ▐{"█".repeat(Math.round(pct / 10))}
          {"░".repeat(10 - Math.round(pct / 10))}▌
        </span>
        <span>100%</span>
      </div>
    </div>
  );
}