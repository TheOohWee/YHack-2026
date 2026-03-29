"use client";

import { displayScoreInt } from "@/lib/display-score";
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
  const pct = displayScoreInt(snapshot.dialPercent) ?? 0;
  const detailIndex =
    displayScoreInt(snapshot.latest?.eco_efficiency_score ?? null) ?? 0;
  const zDisplay = displayScoreInt(snapshot.ecoZScore);
  const data = [{ name: "efficiency", value: pct, fill: FILL }];

  return (
    <div className="flex h-full min-h-[260px] flex-col rounded-xl">
      <div className="mb-4 flex flex-wrap items-center gap-3">
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
        {zDisplay != null ? (
          <>
            {" "}
            Compared with your recent days:{" "}
            <span className="tabular-nums text-[var(--text-secondary)]">
              {zDisplay}
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
              {detailIndex}
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
