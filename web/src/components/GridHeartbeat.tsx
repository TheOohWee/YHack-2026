"use client";

import type { EnergySnapshot } from "@/types/energy";
import { motion } from "framer-motion";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { FuelMixTooltip } from "./FuelMixTooltip";
import { SkeletonChart } from "./SkeletonChart";

export function GridHeartbeat({
  snapshot,
  loading,
}: {
  snapshot: EnergySnapshot | null;
  loading: boolean;
}) {
  if (!snapshot) {
    if (loading) return <SkeletonChart />;
    return (
      <p className="py-12 text-center text-sm text-slate-500">
        No data yet. Fix any error above or run a backend poll so Mongo has
        rows.
      </p>
    );
  }

  const data = snapshot.logs.map((l) => ({ ...l }));

  if (data.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-slate-500">
        No grid readings in the last 24 hours yet. Run a poll to light this up.
      </p>
    );
  }

  return (
    <motion.div
      className="h-full min-h-[280px]"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-200">
          Grid heartbeat
        </h2>
        <span className="text-[11px] text-slate-500">Last 24h · PJM mix</span>
      </div>
      <p className="mb-4 text-xs text-slate-400">
        Full stack from polls:{" "}
        <strong className="text-slate-300">fossil</strong>,{" "}
        <strong className="text-rose-300/90">nuclear</strong>,{" "}
        <strong className="text-cyan-300/90">hydro</strong>,{" "}
        <strong className="text-violet-300/90">other renew. + misc</strong>, wind,
        solar. New rows after deploy include the extra fields; re-run{" "}
        <code className="rounded bg-slate-800 px-1">wattsup-poll</code> to
        refresh.
      </p>
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="fossilg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#94a3b8" stopOpacity={0.9} />
              <stop offset="100%" stopColor="#64748b" stopOpacity={0.25} />
            </linearGradient>
            <linearGradient id="nuclearg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fb7185" stopOpacity={0.9} />
              <stop offset="100%" stopColor="#be123c" stopOpacity={0.3} />
            </linearGradient>
            <linearGradient id="hydrog" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.9} />
              <stop offset="100%" stopColor="#0891b2" stopOpacity={0.3} />
            </linearGradient>
            <linearGradient id="otherg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.85} />
              <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.3} />
            </linearGradient>
            <linearGradient id="wind" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.95} />
              <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.35} />
            </linearGradient>
            <linearGradient id="solar" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.95} />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.35} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
          <XAxis
            dataKey="timestamp"
            tick={{ fill: "#94a3b8", fontSize: 10 }}
            tickLine={false}
            interval="preserveStartEnd"
            minTickGap={28}
            tickFormatter={(ts: string) =>
              new Date(ts).toLocaleTimeString(undefined, {
                hour: "2-digit",
                minute: "2-digit",
              })
            }
          />
          <YAxis
            tick={{ fill: "#94a3b8", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            domain={[0, 100]}
            tickFormatter={(v) => `${v}%`}
            width={36}
          />
          <Tooltip content={<FuelMixTooltip />} />
          <Area
            type="monotone"
            dataKey="fossil_pct"
            name="Fossil"
            stackId="1"
            stroke="#94a3b8"
            fill="url(#fossilg)"
          />
          <Area
            type="monotone"
            dataKey="nuclear_pct"
            name="Nuclear"
            stackId="1"
            stroke="#fb7185"
            fill="url(#nuclearg)"
          />
          <Area
            type="monotone"
            dataKey="hydro_pct"
            name="Hydro"
            stackId="1"
            stroke="#22d3ee"
            fill="url(#hydrog)"
          />
          <Area
            type="monotone"
            dataKey="other_pct"
            name="Other renew. + misc"
            stackId="1"
            stroke="#a78bfa"
            fill="url(#otherg)"
          />
          <Area
            type="monotone"
            dataKey="wind_pct"
            name="Wind"
            stackId="1"
            stroke="#38bdf8"
            fill="url(#wind)"
          />
          <Area
            type="monotone"
            dataKey="solar_pct"
            name="Solar"
            stackId="1"
            stroke="#fbbf24"
            fill="url(#solar)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
