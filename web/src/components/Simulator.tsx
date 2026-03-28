"use client";

import { motion } from "framer-motion";
import { SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";

/** Simple what-if: shift fraction of monthly kWh from high-priced to lower-priced periods. */
export function Simulator() {
  const [hours, setHours] = useState(2);
  const [monthlyKwh] = useState(750);
  const [avgHigh] = useState(9); // ¢/kWh proxy peak
  const [avgLow] = useState(4); // ¢/kWh proxy off-peak

  const result = useMemo(() => {
    const shiftFrac = Math.min(1, hours / 24) * 0.35;
    const shiftedKwh = monthlyKwh * shiftFrac;
    const savings = (shiftedKwh * (avgHigh - avgLow)) / 100;
    const coavoid = shiftedKwh * 0.35 * 0.0004 * 1000;
    return { savings, coavoid };
  }, [hours, monthlyKwh, avgHigh, avgLow]);

  return (
    <div className="rounded-xl border border-slate-700/80 bg-slate-900/40 p-4">
      <div className="mb-3 flex items-center gap-2">
        <SlidersHorizontal className="h-4 w-4 text-slate-400" aria-hidden />
        <h2 className="text-sm font-semibold text-slate-200">
          Load-shift simulator
        </h2>
      </div>
      <p className="mb-4 text-xs text-slate-400">
        Slide to explore moving flexible usage by a few hours — a planning toy,
        not a bill guarantee.
      </p>
      <label htmlFor="shift-hours" className="sr-only">
        Hours to shift usage
      </label>
      <input
        id="shift-hours"
        type="range"
        min={0}
        max={12}
        step={0.5}
        value={hours}
        onChange={(e) => setHours(Number(e.target.value))}
        className="mb-2 h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-700 accent-emerald-500"
      />
      <div className="mb-3 flex justify-between text-xs text-slate-500">
        <span>Same-day timing</span>
        <span className="tabular-nums text-slate-300">{hours} h shift</span>
      </div>
      <motion.div
        className="grid gap-2 rounded-lg bg-slate-800/60 px-3 py-2 text-sm"
        key={hours}
        initial={{ opacity: 0.7 }}
        animate={{ opacity: 1 }}
      >
        <p className="text-slate-300">
          Rough monthly savings:{" "}
          <span className="font-semibold tabular-nums text-emerald-400">
            ${result.savings.toFixed(2)}
          </span>
        </p>
        <p className="text-xs text-slate-500">
          illustrative CO₂ avoided (~):{" "}
          <span className="tabular-nums text-slate-400">
            {result.coavoid.toFixed(1)} kg
          </span>
        </p>
      </motion.div>
    </div>
  );
}
