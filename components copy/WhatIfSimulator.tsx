"use client";

import { ApplianceKey } from "@/lib/types";
import { ApplianceResult } from "@/lib/types";
import { TIME_SLOTS, formatHour } from "@/lib/data";
import clsx from "clsx";

interface Props {
  results: ApplianceResult[];
  overrides: Partial<Record<ApplianceKey, number>>;
  onOverride: (key: ApplianceKey, hour: number) => void;
}

export default function WhatIfSimulator({ results, overrides, onOverride }: Props) {
  return (
    <div className="space-y-4">
      {results.map((r) => {
        const currentHour = overrides[r.key] ?? r.currentHour;
        const isShifted = overrides[r.key] !== undefined;
        const savingSign = r.savingsDollars > 0;

        return (
          <div
            key={r.key}
            className={clsx(
              "rounded-xl p-4 border-2 transition-all",
              isShifted
                ? "border-emerald-300 bg-emerald-50"
                : "border-slate-100 bg-slate-50"
            )}
          >
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              {/* Label */}
              <div className="flex items-center gap-2 min-w-[140px]">
                <span className="text-xl">{r.emoji}</span>
                <div>
                  <p className="font-semibold text-slate-800 text-sm">{r.name}</p>
                  <p className="text-xs text-slate-500">
                    {r.usesPerMonth}×/mo · {r.kWhPerUse} kWh each
                  </p>
                </div>
              </div>

              {/* Time picker */}
              <div className="flex items-center gap-2 flex-1">
                <span className="text-xs text-slate-500 shrink-0">Run at:</span>
                <select
                  className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  value={currentHour}
                  onChange={(e) => onOverride(r.key, Number(e.target.value))}
                >
                  {TIME_SLOTS.map((ts) => (
                    <option key={ts.hour} value={ts.hour}>
                      {ts.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Savings readout */}
              <div className="text-right shrink-0">
                <p
                  className={clsx(
                    "text-sm font-bold",
                    savingSign ? "text-emerald-600" : "text-slate-400"
                  )}
                >
                  {savingSign ? `−$${r.savingsDollars.toFixed(2)}/mo` : "already optimal"}
                </p>
                {savingSign && (
                  <p className="text-xs text-slate-500">
                    −{r.savingsLbsCO2.toFixed(0)} lbs CO₂
                  </p>
                )}
              </div>
            </div>

            {/* Progress bar: current vs optimal */}
            {savingSign && (
              <div className="mt-3">
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Now: ${r.currentMonthlyCost.toFixed(2)}/mo</span>
                  <span>Optimal ({formatHour(r.optimalHour)}): ${r.optimalMonthlyCost.toFixed(2)}/mo</span>
                </div>
                <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.max(0, Math.min(100, (r.savingsDollars / r.currentMonthlyCost) * 100))}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
