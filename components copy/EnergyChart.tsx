"use client";

import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { HOURLY_PRICE_CENTS, HOURLY_EMISSIONS_LBS, formatHour } from "@/lib/data";
import { ApplianceKey } from "@/lib/types";
import { APPLIANCES } from "@/lib/data";

interface Props {
  userTimings: Partial<Record<ApplianceKey, number>>;
}

const data = Array.from({ length: 24 }, (_, h) => ({
  hour: h,
  label: formatHour(h),
  price: HOURLY_PRICE_CENTS[h],
  emissions: +(HOURLY_EMISSIONS_LBS[h] * 100).toFixed(1), // scaled for dual axis display
}));

const COLORS: Record<ApplianceKey, string> = {
  laundry: "#6366f1",
  dishwasher: "#0ea5e9",
  ac_heating: "#f59e0b",
  ev_charging: "#10b981",
  oven_stove: "#f43f5e",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 text-white px-3 py-2 rounded-lg text-xs shadow-xl">
      <p className="font-bold mb-1">{label}</p>
      {payload.map((p: { name: string; value: number; color: string }, i: number) => (
        <p key={i} style={{ color: p.color }}>
          {p.name === "price"
            ? `Price: ${p.value}¢/kWh`
            : `Carbon: ${(p.value / 100).toFixed(2)} lbs/kWh`}
        </p>
      ))}
    </div>
  );
}

export default function EnergyChart({ userTimings }: Props) {
  const timingEntries = Object.entries(userTimings) as [ApplianceKey, number][];

  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data} margin={{ top: 8, right: 20, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="emitGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
        </defs>

        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />

        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          interval={3}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          yAxisId="price"
          domain={[0, 35]}
          tick={{ fontSize: 11, fill: "#f59e0b" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `${v}¢`}
          width={32}
        />
        <YAxis
          yAxisId="emissions"
          orientation="right"
          domain={[0, 85]}
          tick={{ fontSize: 11, fill: "#818cf8" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `${(v / 100).toFixed(2)}`}
          width={40}
        />

        <Tooltip content={<CustomTooltip />} />

        <Legend
          formatter={(value) =>
            value === "price" ? "Price (¢/kWh)" : "Carbon (lbs/kWh)"
          }
          wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
        />

        <Area
          yAxisId="price"
          type="monotone"
          dataKey="price"
          stroke="#f59e0b"
          strokeWidth={2.5}
          fill="url(#priceGrad)"
          dot={false}
          activeDot={{ r: 4 }}
        />
        <Area
          yAxisId="emissions"
          type="monotone"
          dataKey="emissions"
          stroke="#818cf8"
          strokeWidth={2}
          fill="url(#emitGrad)"
          dot={false}
          activeDot={{ r: 4 }}
        />

        {/* Mark user's appliance usage times */}
        {timingEntries.map(([key, hour]) => (
          <ReferenceLine
            key={key}
            yAxisId="price"
            x={formatHour(hour)}
            stroke={COLORS[key]}
            strokeWidth={2}
            strokeDasharray="4 2"
            label={{
              value: APPLIANCES[key].emoji,
              position: "top",
              fontSize: 14,
            }}
          />
        ))}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
