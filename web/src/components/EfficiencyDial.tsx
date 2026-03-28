"use client";

import type { EnergySnapshot } from "@/types/energy";
import {
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
} from "recharts";

const FILL = "#5a8f6a";
const TRACK = "#e5e1d9";

export function EfficiencyDial({ snapshot }: { snapshot: EnergySnapshot }) {
  const pct = Math.round(snapshot.dialPercent);
  const score = snapshot.latest?.eco_efficiency_score ?? 0;
  const data = [{ name: "efficiency", value: pct, fill: FILL }];

  return (
    <div className="relative flex h-full min-h-[260px] flex-col rounded-xl">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-[var(--text)]">
          How clean was your timing?
        </h2>
        <span className="rounded-full bg-[var(--accent-wash)] px-3 py-1 text-sm font-medium text-[var(--accent)]">
          Your blend
        </span>
      </div>
      <p className="mb-4 text-base text-[var(--text-muted)]">
        We mix renewables and price into one score so you can see progress at a
        glance.
        {snapshot.ecoZScore != null ? (
          <>
            {" "}
            Compared with your recent days:{" "}
            <span className="tabular-nums text-[var(--text-secondary)]">
              {snapshot.ecoZScore.toFixed(2)}
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
    </div>
  );
}
