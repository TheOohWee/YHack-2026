"use client";

import { decimateLogsByTimeGap } from "@/lib/quant-compute";
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

const GRID_STROKE = "#d8d4cc";
const AXIS = "#6f7a72";

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
      <p className="py-12 text-center text-base text-[var(--text-muted)]">
        No data yet. Fix any message above or run a poll so we can show your
        last day.
      </p>
    );
  }

  const chartLogs = decimateLogsByTimeGap(snapshot.logs);
  const data = chartLogs.map((l) => ({
    ...l,
    clean_share: Math.min(100, l.wind + l.solar),
  }));

  if (data.length === 0) {
    return (
      <p className="py-12 text-center text-base text-[var(--text-muted)]">
        No readings in the last 24 hours yet. After the next poll, your rhythm
        will appear here.
      </p>
    );
  }

  return (
    <div className="h-full min-h-[320px] space-y-8">
      <div>
        <h3 className="text-base font-semibold text-[var(--text)]">
          Wind and solar through the day
        </h3>
        <p className="mt-1 text-base text-[var(--text-muted)]">
          A smooth line — higher means more of your power came from wind and sun
          at each moment.
        </p>
        <div className="mt-4 h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 6" stroke={GRID_STROKE} vertical={false} />
              <XAxis
                dataKey="timestamp"
                tick={{ fill: AXIS, fontSize: 13 }}
                tickLine={false}
                interval="preserveStartEnd"
                minTickGap={32}
                tickFormatter={(ts: string) =>
                  new Date(ts).toLocaleTimeString(undefined, {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                }
              />
              <YAxis
                tick={{ fill: AXIS, fontSize: 13 }}
                tickLine={false}
                axisLine={false}
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
                width={44}
              />
              <Line
                type="monotone"
                dataKey="clean_share"
                name="Wind + solar"
                stroke="#5a8f6a"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5, fill: "#5a8f6a" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-[var(--text)]">
            How the full mix moved
          </h2>
          <span className="text-sm text-[var(--text-muted)]">
            Last 24 hours · regional blend
          </span>
        </div>
        <p className="mb-4 text-base text-[var(--text-muted)]">
          Layered areas show each fuel source as a share of generation. Tap the
          chart to see exact percentages at any time.
        </p>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="coalg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#9a9288" stopOpacity={0.85} />
                <stop offset="100%" stopColor="#9a9288" stopOpacity={0.2} />
              </linearGradient>
              <linearGradient id="gasg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#c4a574" stopOpacity={0.85} />
                <stop offset="100%" stopColor="#c4a574" stopOpacity={0.2} />
              </linearGradient>
              <linearGradient id="nuclearg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#b89da8" stopOpacity={0.8} />
                <stop offset="100%" stopColor="#b89da8" stopOpacity={0.2} />
              </linearGradient>
              <linearGradient id="importsg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#9eb8c9" stopOpacity={0.85} />
                <stop offset="100%" stopColor="#9eb8c9" stopOpacity={0.2} />
              </linearGradient>
              <linearGradient id="otherg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#a89bc9" stopOpacity={0.75} />
                <stop offset="100%" stopColor="#a89bc9" stopOpacity={0.2} />
              </linearGradient>
              <linearGradient id="batteryg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#c9b8d4" stopOpacity={0.75} />
                <stop offset="100%" stopColor="#c9b8d4" stopOpacity={0.2} />
              </linearGradient>
              <linearGradient id="wind" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8fbcb0" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#8fbcb0" stopOpacity={0.25} />
              </linearGradient>
              <linearGradient id="solar" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#e4c48a" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#e4c48a" stopOpacity={0.25} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 6" stroke={GRID_STROKE} opacity={0.7} />
            <XAxis
              dataKey="timestamp"
              tick={{ fill: AXIS, fontSize: 12 }}
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
              tick={{ fill: AXIS, fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
              width={40}
            />
            <Tooltip content={<FuelMixTooltip />} />
            <Area
              type="monotone"
              dataKey="coal"
              name="Coal"
              stackId="1"
              stroke="#8a8278"
              fill="url(#coalg)"
            />
            <Area
              type="monotone"
              dataKey="natural_gas"
              name="Natural gas"
              stackId="1"
              stroke="#b89560"
              fill="url(#gasg)"
            />
            <Area
              type="monotone"
              dataKey="nuclear"
              name="Nuclear"
              stackId="1"
              stroke="#a88d9a"
              fill="url(#nuclearg)"
            />
            <Area
              type="monotone"
              dataKey="imports"
              name="Imports"
              stackId="1"
              stroke="#8faab8"
              fill="url(#importsg)"
            />
            <Area
              type="monotone"
              dataKey="other"
              name="Other"
              stackId="1"
              stroke="#9a8db8"
              fill="url(#otherg)"
            />
            <Area
              type="monotone"
              dataKey="battery_storage"
              name="Battery storage"
              stackId="1"
              stroke="#b0a0c0"
              fill="url(#batteryg)"
            />
            <Area
              type="monotone"
              dataKey="wind"
              name="Wind"
              stackId="1"
              stroke="#6fa896"
              fill="url(#wind)"
            />
            <Area
              type="monotone"
              dataKey="solar"
              name="Solar"
              stackId="1"
              stroke="#d4b070"
              fill="url(#solar)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
