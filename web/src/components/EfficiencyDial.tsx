"use client";

import type { EnergySnapshot } from "@/types/energy";
import { motion } from "framer-motion";
import {
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
} from "recharts";

const EMERALD = "#10B981";
const TRACK = "#1e293b";

export function EfficiencyDial({
  snapshot,
  alert,
}: {
  snapshot: EnergySnapshot;
  alert?: boolean;
}) {
  const pct = Math.round(snapshot.dialPercent);
  const score = snapshot.latest?.eco_efficiency_score ?? 0;
  const data = [{ name: "efficiency", value: pct, fill: EMERALD }];
  const ring =
    alert === true
      ? "ring-2 ring-amber-400/90 ring-offset-2 ring-offset-slate-900/80"
      : "";

  return (
    <div
      className={`relative flex h-full min-h-[240px] flex-col rounded-xl transition-shadow ${ring}`}
    >
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-wide text-slate-200">
          Efficiency score
        </h2>
        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-400">
          Clean alpha
        </span>
      </div>
      <p className="mb-4 text-xs text-slate-400">
        Renewable share weighted by price and demand.{" "}
        {snapshot.ecoZScore != null ? (
          <>
            Eco σ vs your polls:{" "}
            <span className="tabular-nums text-slate-300">
              {snapshot.ecoZScore.toFixed(2)}
            </span>
            {snapshot.ecoZScoreAlert ? " — unusual spike." : "."}
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
              animationDuration={900}
            />
          </RadialBarChart>
        </ResponsiveContainer>
        <motion.div
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
        >
          <div className="text-center">
            <p className="text-3xl font-bold tabular-nums text-slate-100">
              {pct}%
            </p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-emerald-400/90">
              {score >= 1000 ? score.toExponential(2) : score.toFixed(1)}
            </p>
            <p className="text-[11px] uppercase tracking-wider text-slate-500">
              raw index
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
