"use client";

import { useState, useMemo } from "react";
import { UserInput, ApplianceKey } from "@/lib/types";
import {
  computeResults,
  totalSavings,
  generateRecommendations,
  formatHour,
  cheapestHours,
  cleanestHours,
  dirtiestHours,
  mostExpensiveHours,
} from "@/lib/calculations";
import { APPLIANCES, TIME_SLOTS, DEMO_USER } from "@/lib/data";
import EnergyChart from "./EnergyChart";
import WhatIfSimulator from "./WhatIfSimulator";
import clsx from "clsx";

interface Props {
  input: UserInput;
  onReset: () => void;
}

export default function Dashboard({ input, onReset }: Props) {
  const [overrides, setOverrides] = useState<Partial<Record<ApplianceKey, number>>>(
    {}
  );

  const results = useMemo(
    () => computeResults(input, overrides),
    [input, overrides]
  );

  const { dollars, co2, currentCost } = useMemo(
    () => totalSavings(results),
    [results]
  );

  const recommendations = useMemo(
    () => generateRecommendations(results, input),
    [results, input]
  );

  const pct = dollars > 0 && currentCost > 0 ? (dollars / currentCost) * 100 : 0;
  const co2Kg = (co2 * 0.453592).toFixed(1);

  const cheap = cheapestHours(4);
  const clean = cleanestHours(4);
  const dirty = dirtiestHours(3);
  const expensive = mostExpensiveHours(3);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top nav */}
      <nav className="bg-slate-900 sticky top-0 z-10 px-6 py-3 flex items-center justify-between shadow">
        <div className="flex items-center gap-2">
          <span className="text-xl">⚡</span>
          <span className="text-white font-extrabold text-lg tracking-tight">
            GridWise
          </span>
          <span className="ml-3 px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded-full font-medium">
            Your Report
          </span>
        </div>
        <button
          onClick={onReset}
          className="text-slate-400 hover:text-white text-sm transition"
        >
          ← Start over
        </button>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Summary hero */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SummaryCard
            title="Est. monthly savings"
            value={`$${dollars.toFixed(2)}`}
            sub={`${pct.toFixed(0)}% of your appliance cost`}
            color="emerald"
            icon="💰"
          />
          <SummaryCard
            title="CO₂ avoided / month"
            value={`${co2.toFixed(0)} lbs`}
            sub={`≈ ${co2Kg} kg · like skipping ${Math.round(co2 / 19.4)} car trips`}
            color="sky"
            icon="🌿"
          />
          <SummaryCard
            title="Appliance cost now"
            value={`$${currentCost.toFixed(2)}/mo`}
            sub={
              input.monthlyBill
                ? `~${Math.round((currentCost / input.monthlyBill) * 100)}% of your $${input.monthlyBill} bill`
                : "Based on usage model"
            }
            color="amber"
            icon="🔌"
          />
        </div>

        {/* Chart */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h2 className="font-bold text-slate-800 mb-1">
            Hourly Price &amp; Carbon Intensity
          </h2>
          <p className="text-xs text-slate-400 mb-5">
            Based on a typical TOU rate structure and EPA grid emissions data.
            Your appliance usage times are marked.
          </p>
          <EnergyChart userTimings={Object.entries(overrides).length > 0
            ? { ...input.timings, ...overrides }
            : input.timings}
          />
        </div>

        {/* Good / bad hours */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <HourBadgeCard
            title="Best hours to run appliances"
            sub="Cheapest price + cleanest grid"
            hours={[...new Set([...cheap, ...clean])].slice(0, 5)}
            variant="good"
          />
          <HourBadgeCard
            title="Hours to avoid"
            sub="Peak price + dirtiest grid"
            hours={[...new Set([...dirty, ...expensive])].slice(0, 5)}
            variant="bad"
          />
        </div>

        {/* What-if simulator */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h2 className="font-bold text-slate-800 mb-1">What-If Simulator</h2>
          <p className="text-xs text-slate-400 mb-5">
            Drag each appliance to a different time and see your savings update in real time.
          </p>
          <WhatIfSimulator
            results={results}
            overrides={overrides}
            onOverride={(key, hour) =>
              setOverrides((prev) => ({ ...prev, [key]: hour }))
            }
          />
        </div>

        {/* Cost breakdown */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h2 className="font-bold text-slate-800 mb-4">Appliance Cost Breakdown</h2>
          <div className="space-y-3">
            {[...results]
              .sort((a, b) => b.currentMonthlyCost - a.currentMonthlyCost)
              .map((r) => {
                const maxCost = Math.max(...results.map((x) => x.currentMonthlyCost));
                const pctBar = (r.currentMonthlyCost / maxCost) * 100;
                const saving = r.savingsDollars > 0;
                return (
                  <div key={r.key}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-slate-700">
                        {r.emoji} {r.name}
                      </span>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-slate-500">
                          ${r.currentMonthlyCost.toFixed(2)}/mo
                        </span>
                        {saving && (
                          <span className="text-emerald-600 font-semibold">
                            −${r.savingsDollars.toFixed(2)} possible
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-amber-400 to-rose-400 transition-all duration-500"
                        style={{ width: `${pctBar}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Recommendations */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white">
          <h2 className="font-bold text-lg mb-1">
            Your top {recommendations.length} recommendations
          </h2>
          <p className="text-slate-400 text-xs mb-5">
            Personalized based on your home and habits.
          </p>
          <div className="space-y-4">
            {recommendations.map((rec, i) => (
              <div key={i} className="flex gap-4">
                <div className="w-7 h-7 rounded-full bg-emerald-500 text-white text-sm font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </div>
                <p className="text-slate-200 text-sm leading-relaxed">{rec}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 pb-4">
          GridWise uses modeled TOU pricing (~8–30¢/kWh) and EPA AVERT emissions factors (~0.2–0.74 lbs CO₂/kWh).
          Estimates are illustrative and not a guarantee of savings.
        </p>
      </div>
    </div>
  );
}

function SummaryCard({
  title, value, sub, color, icon,
}: {
  title: string;
  value: string;
  sub: string;
  color: "emerald" | "sky" | "amber";
  icon: string;
}) {
  const colors = {
    emerald: "from-emerald-500 to-teal-600",
    sky: "from-sky-500 to-blue-600",
    amber: "from-amber-400 to-orange-500",
  };
  return (
    <div
      className={clsx(
        "rounded-2xl p-5 bg-gradient-to-br text-white shadow-md",
        colors[color]
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium opacity-90">{title}</span>
        <span className="text-xl">{icon}</span>
      </div>
      <div className="text-3xl font-extrabold mb-1">{value}</div>
      <div className="text-xs opacity-75">{sub}</div>
    </div>
  );
}

function HourBadgeCard({
  title, sub, hours, variant,
}: {
  title: string;
  sub: string;
  hours: number[];
  variant: "good" | "bad";
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
      <h3 className="font-bold text-slate-800 text-sm mb-0.5">{title}</h3>
      <p className="text-xs text-slate-400 mb-4">{sub}</p>
      <div className="flex flex-wrap gap-2">
        {hours.sort((a, b) => a - b).map((h) => (
          <span
            key={h}
            className={clsx(
              "px-3 py-1 rounded-full text-sm font-semibold",
              variant === "good"
                ? "bg-emerald-100 text-emerald-700"
                : "bg-rose-100 text-rose-700"
            )}
          >
            {formatHour(h)}
          </span>
        ))}
      </div>
    </div>
  );
}
