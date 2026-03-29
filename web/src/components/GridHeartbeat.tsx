"use client";

import type { EnergySnapshot } from "@/types/energy";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { FuelMixTooltip } from "./FuelMixTooltip";
import { SkeletonChart } from "./SkeletonChart";
import { StatTooltip } from "./StatTooltip";

const GRID_STROKE = "#1e4d24";
const AXIS = "#5a8a64";

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
      <p className="py-12 text-center text-xs" style={{ color: "var(--text-muted)" }}>
        NO DATA YET<span className="blink">_</span> Fix any message above or run a poll.
      </p>
    );
  }

  const data = snapshot.logs.map((l) => ({
    ...l,
    clean_share: Math.min(100, l.wind + l.solar),
  }));

  if (data.length === 0) {
    return (
      <p className="py-12 text-center text-xs" style={{ color: "var(--text-muted)" }}>
        No readings in the last 24 hours<span className="blink">_</span>
      </p>
    );
  }

  return (
    <div className="h-full min-h-[320px] space-y-10">
      {/* ── Wind + Solar line chart ── */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <h3
            className="text-sm font-bold uppercase tracking-widest"
            style={{ color: "var(--text-secondary)", letterSpacing: "0.12em" }}
          >
            Wind &amp; Solar
          </h3>
          <StatTooltip tip="Percentage of grid power from wind + solar combined at each moment. Higher = cleaner electricity for your home. Aim to run big appliances when this line peaks." />
        </div>
        <p className="mb-4 text-[11px]" style={{ color: "var(--text-muted)" }}>
          Higher means more of your power came from wind and sun at each moment.
        </p>
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="4 4" stroke={GRID_STROKE} vertical={false} />
              <XAxis
                dataKey="timestamp"
                tick={{ fill: AXIS, fontSize: 11, fontFamily: "var(--font-game)" }}
                tickLine={false}
                interval="preserveStartEnd"
                minTickGap={32}
                tickFormatter={(ts: string) =>
                  new Date(ts).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
                }
              />
              <YAxis
                tick={{ fill: AXIS, fontSize: 11, fontFamily: "var(--font-game)" }}
                tickLine={false}
                axisLine={false}
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
                width={44}
              />
              <Line
                type="monotone"
                dataKey="clean_share"
                name="Wind + Solar"
                stroke="#4ade80"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5, fill: "#4ade80", stroke: "#071a0c", strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Full fuel mix stacked area ── */}
      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2
              className="text-sm font-bold uppercase tracking-widest"
              style={{ color: "var(--text-secondary)", letterSpacing: "0.12em" }}
            >
              Full Fuel Mix
            </h2>
            <StatTooltip tip="Stacked areas show each fuel source as a share of generation over 24 hours. Coal/gas = dirty. Wind/solar = clean. Nuclear = low-carbon but not renewable. Hover the chart to see exact percentages at any time." />
          </div>
          <span className="text-[10px] uppercase" style={{ color: "var(--text-muted)", letterSpacing: "0.1em" }}>
            Last 24h · Regional blend
          </span>
        </div>
        <p className="mb-4 text-[11px]" style={{ color: "var(--text-muted)" }}>
          Tap to see exact percentages at any point in time.
        </p>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="coalg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6b5b5b" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#6b5b5b" stopOpacity={0.2} />
              </linearGradient>
              <linearGradient id="gasg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#c4a574" stopOpacity={0.85} />
                <stop offset="100%" stopColor="#c4a574" stopOpacity={0.2} />
              </linearGradient>
              <linearGradient id="nuclearg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#e9d5ff" stopOpacity={0.75} />
                <stop offset="100%" stopColor="#e9d5ff" stopOpacity={0.2} />
              </linearGradient>
              <linearGradient id="importsg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#bae6fd" stopOpacity={0.75} />
                <stop offset="100%" stopColor="#bae6fd" stopOpacity={0.2} />
              </linearGradient>
              <linearGradient id="otherg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#a89bc9" stopOpacity={0.65} />
                <stop offset="100%" stopColor="#a89bc9" stopOpacity={0.15} />
              </linearGradient>
              <linearGradient id="batteryg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fce7f3" stopOpacity={0.70} />
                <stop offset="100%" stopColor="#fce7f3" stopOpacity={0.15} />
              </linearGradient>
              <linearGradient id="wind" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4ade80" stopOpacity={0.90} />
                <stop offset="100%" stopColor="#4ade80" stopOpacity={0.25} />
              </linearGradient>
              <linearGradient id="solar" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fef08a" stopOpacity={0.90} />
                <stop offset="100%" stopColor="#fef08a" stopOpacity={0.25} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="4 4" stroke={GRID_STROKE} opacity={0.6} />
            <XAxis
              dataKey="timestamp"
              tick={{ fill: AXIS, fontSize: 11, fontFamily: "var(--font-game)" }}
              tickLine={false}
              interval="preserveStartEnd"
              minTickGap={28}
              tickFormatter={(ts: string) =>
                new Date(ts).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
              }
            />
            <YAxis
              tick={{ fill: AXIS, fontSize: 11, fontFamily: "var(--font-game)" }}
              tickLine={false}
              axisLine={false}
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
              width={40}
            />
            <Tooltip content={<FuelMixTooltip />} />
            <Area type="monotone" dataKey="coal"            name="Coal"            stackId="1" stroke="#5a4a4a" fill="url(#coalg)" />
            <Area type="monotone" dataKey="natural_gas"     name="Natural gas"     stackId="1" stroke="#b89560" fill="url(#gasg)" />
            <Area type="monotone" dataKey="nuclear"         name="Nuclear"         stackId="1" stroke="#c4a8e0" fill="url(#nuclearg)" />
            <Area type="monotone" dataKey="imports"         name="Imports"         stackId="1" stroke="#90c8e8" fill="url(#importsg)" />
            <Area type="monotone" dataKey="other"           name="Other"           stackId="1" stroke="#9080b8" fill="url(#otherg)" />
            <Area type="monotone" dataKey="battery_storage" name="Battery storage" stackId="1" stroke="#d8a8c0" fill="url(#batteryg)" />
            <Area type="monotone" dataKey="wind"            name="Wind"            stackId="1" stroke="#22c55e" fill="url(#wind)" />
            <Area type="monotone" dataKey="solar"           name="Solar"           stackId="1" stroke="#eab308" fill="url(#solar)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
