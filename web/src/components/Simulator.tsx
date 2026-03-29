"use client";

import { useMemo, useState } from "react";
import { StatTooltip } from "./StatTooltip";

/** Simple what-if: shift fraction of monthly kWh from high-priced to lower-priced periods. */
export function Simulator() {
  const [hours, setHours] = useState(2);
  const [monthlyKwh] = useState(750);
  const [avgHigh] = useState(9);
  const [avgLow] = useState(4);

  const result = useMemo(() => {
    const shiftFrac = Math.min(1, hours / 24) * 0.35;
    const shiftedKwh = monthlyKwh * shiftFrac;
    const savings = (shiftedKwh * (avgHigh - avgLow)) / 100;
    const coavoid = shiftedKwh * 0.35 * 0.0004 * 1000;
    return { savings, coavoid };
  }, [hours, monthlyKwh, avgHigh, avgLow]);

  const sliderPct = Math.round((hours / 12) * 100);

  return (
    <div
      className="rounded-sm p-6"
      style={{
        background: "var(--surface-card)",
        border: "2px solid var(--border-soft)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      <div className="mb-2 flex items-center gap-2">
        <h2
          className="text-sm font-bold uppercase tracking-widest"
          style={{ color: "var(--text-secondary)", letterSpacing: "0.15em" }}
        >
          Usage Shift Simulator
        </h2>
        <StatTooltip tip="A what-if calculator: drag to see how much you could save monthly by moving flexible chores like laundry, dishwasher runs, or EV charging by a few hours. The result is illustrative, not a guarantee on your actual bill." />
      </div>

      <p className="mb-6 text-xs" style={{ color: "var(--text-muted)" }}>
        Slide to imagine shifting flexible usage. Planning helper — not a bill promise.
      </p>

      <label
        htmlFor="shift-hours"
        className="mb-3 block text-[11px] font-bold uppercase tracking-widest"
        style={{ color: "var(--text-muted)", letterSpacing: "0.15em" }}
      >
        Hours to Shift
      </label>

      <div className="relative max-w-xl">
        <div className="xp-bar-track mb-2">
          <div className="xp-bar-fill" style={{ width: `${sliderPct}%` }} />
        </div>

        <input
          id="shift-hours"
          type="range"
          min={0}
          max={12}
          step={0.5}
          value={hours}
          onChange={(e) => setHours(Number(e.target.value))}
          className="w-full cursor-pointer appearance-none"
          style={{
            height: "0",
            position: "absolute",
            top: "4px",
            left: "0",
            right: "0",
            background: "transparent",
            accentColor: "var(--accent)",
          }}
        />
      </div>

      <div
        className="mt-3 flex max-w-xl justify-between text-[11px] uppercase"
        style={{ color: "var(--text-muted)" }}
      >
        <span>Same-day</span>
        <span className="font-bold" style={{ color: "var(--accent)" }}>
          {hours} HRS
        </span>
        <span>12 hrs</span>
      </div>

      <div
        className="mt-6 max-w-xl rounded-sm px-4 py-4"
        style={{
          background: "var(--surface-muted)",
          border: "2px solid var(--border-soft)",
          boxShadow: "4px 4px 0 rgba(74,222,128,0.08)",
        }}
      >
        <div className="flex items-baseline gap-2">
          <span className="text-sm" style={{ color: "var(--text-muted)" }}>
            Monthly savings:
          </span>
          <span
            className="text-2xl font-bold tabular-nums text-glow-pastel-yellow"
            style={{ color: "var(--pastel-yellow)" }}
          >
            ${result.savings.toFixed(2)}
          </span>
        </div>

        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            CO₂ avoided:
          </span>
          <span
            className="text-base font-bold tabular-nums"
            style={{ color: "var(--pastel-mint)" }}
          >
            {result.coavoid.toFixed(1)} kg
          </span>
        </div>
      </div>
    </div>
  );
}