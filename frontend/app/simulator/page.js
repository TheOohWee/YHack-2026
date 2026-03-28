"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Navbar from "../../components/Navbar";
import { api } from "../../lib/api";

const BarChart = dynamic(() => import("recharts").then((m) => m.BarChart), { ssr: false });
const Bar = dynamic(() => import("recharts").then((m) => m.Bar), { ssr: false });
const XAxis = dynamic(() => import("recharts").then((m) => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then((m) => m.YAxis), { ssr: false });
const Tooltip = dynamic(() => import("recharts").then((m) => m.Tooltip), { ssr: false });
const ResponsiveContainer = dynamic(() => import("recharts").then((m) => m.ResponsiveContainer), { ssr: false });

export default function SimulatorPage() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [changes, setChanges] = useState({});
  const [simResult, setSimResult] = useState(null);
  const [simulating, setSimulating] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("wattwise_results");
    if (!raw) { router.push("/onboarding"); return; }
    setData(JSON.parse(raw));
  }, [router]);

  useEffect(() => {
    if (!data || Object.keys(changes).length === 0) {
      setSimResult(null);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSimulating(true);
      try {
        const result = await api.simulate(data.home, data.bill, changes);
        setSimResult(result);
      } catch (err) {
        console.error("Simulate error:", err);
      } finally {
        setSimulating(false);
      }
    }, 300);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [changes, data]);

  function toggle(field, value) {
    setChanges((prev) => {
      const next = { ...prev };
      if (value === data.home[field]) {
        delete next[field];
      } else {
        next[field] = value;
      }
      return next;
    });
  }

  function setField(field, value) {
    setChanges((prev) => ({ ...prev, [field]: value }));
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-gray-200 border-t-brand-500 rounded-full animate-spin-slow" />
      </div>
    );
  }

  const baseline = data.estimate;
  const current = simResult?.modified || baseline;
  const deltas = simResult?.deltas || null;
  const recs = simResult?.recommendations || data.recommendations;
  const home = data.home;

  const comparisonData = [
    { name: "Cost ($/mo)", before: baseline.total_monthly_cost, after: current.total_monthly_cost },
    { name: "CO₂ (kg/mo)", before: baseline.carbon_kg_per_month, after: current.carbon_kg_per_month },
    { name: "kWh/mo", before: baseline.kwh_per_month, after: current.kwh_per_month },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar
        actions={
          <button
            onClick={() => router.push("/results")}
            className="text-gray-500 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-100 transition"
          >
            ← Results
          </button>
        }
      />

      <div className="max-w-6xl mx-auto px-6 pt-8 pb-20">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 animate-fade-up">
          What-If Simulator
        </h1>
        <p className="text-gray-500 mb-8 animate-fade-up">
          Toggle upgrades and adjustments. See how your energy profile changes in real time.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Controls - left side */}
          <div className="lg:col-span-2 space-y-4 animate-fade-up">
            {/* Quick toggles */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="font-bold text-gray-900 mb-4 text-sm uppercase tracking-wide">Quick Upgrades</h3>
              <div className="space-y-3">
                <Toggle
                  label="Add Solar Panels"
                  description="6kW rooftop system"
                  checked={changes.has_solar ?? home.has_solar}
                  original={home.has_solar}
                  onChange={(v) => toggle("has_solar", v)}
                />
                <Toggle
                  label="Switch to Heat Pump"
                  description="Replace gas/oil furnace"
                  checked={(changes.heating_type ?? home.heating_type) === "heat_pump"}
                  original={home.heating_type === "heat_pump"}
                  onChange={(v) => setField("heating_type", v ? "heat_pump" : home.heating_type)}
                />
                <Toggle
                  label="Upgrade Insulation"
                  description="Poor/average → good"
                  checked={(changes.insulation ?? home.insulation) === "good"}
                  original={home.insulation === "good"}
                  onChange={(v) => setField("insulation", v ? "good" : home.insulation)}
                />
                <Toggle
                  label="Double-Pane Windows"
                  description="Replace single-pane"
                  checked={(changes.windows ?? home.windows) === "double"}
                  original={home.windows === "double" || home.windows === "triple"}
                  onChange={(v) => setField("windows", v ? "double" : home.windows)}
                />
                <Toggle
                  label="Heat Pump Water Heater"
                  description="Replace gas/electric tank"
                  checked={(changes.water_heater ?? home.water_heater) === "heat_pump"}
                  original={home.water_heater === "heat_pump"}
                  onChange={(v) => setField("water_heater", v ? "heat_pump" : home.water_heater)}
                />
                <Toggle
                  label="Add EV (home charging)"
                  description="~300 kWh/month"
                  checked={changes.has_ev ?? home.has_ev}
                  original={home.has_ev}
                  onChange={(v) => toggle("has_ev", v)}
                />
              </div>
            </div>

            {/* Sliders */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="font-bold text-gray-900 mb-4 text-sm uppercase tracking-wide">Adjust Home</h3>
              <Slider
                label="Square Footage"
                value={changes.sqft ?? home.sqft}
                min={500} max={5000} step={100}
                format={(v) => `${v.toLocaleString()} sq ft`}
                onChange={(v) => setField("sqft", v)}
              />
              <Slider
                label="Year Built"
                value={changes.year_built ?? home.year_built}
                min={1920} max={2024} step={1}
                format={(v) => `${v}`}
                onChange={(v) => setField("year_built", v)}
              />
              <Slider
                label="Occupants"
                value={changes.num_occupants ?? home.num_occupants}
                min={1} max={8} step={1}
                format={(v) => `${v} people`}
                onChange={(v) => setField("num_occupants", v)}
              />
            </div>

            {Object.keys(changes).length > 0 && (
              <button
                onClick={() => setChanges({})}
                className="w-full text-gray-500 py-2 text-sm hover:text-gray-700 transition"
              >
                Reset all changes
              </button>
            )}
          </div>

          {/* Results - right side */}
          <div className="lg:col-span-3 space-y-4 animate-fade-up-delay">
            {/* Delta cards */}
            <div className="grid grid-cols-2 gap-4">
              <DeltaCard
                label="Monthly Cost"
                before={baseline.total_monthly_cost}
                after={current.total_monthly_cost}
                delta={deltas?.total_monthly_cost}
                prefix="$"
                loading={simulating}
              />
              <DeltaCard
                label="CO₂/month"
                before={baseline.carbon_kg_per_month}
                after={current.carbon_kg_per_month}
                delta={deltas?.carbon_kg_per_month}
                suffix=" kg"
                loading={simulating}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <DeltaCard
                label="Electricity"
                before={baseline.kwh_per_month}
                after={current.kwh_per_month}
                delta={deltas?.kwh_per_month}
                suffix=" kWh"
                loading={simulating}
              />
              <DeltaCard
                label="Gas"
                before={baseline.therms_per_month}
                after={current.therms_per_month}
                delta={deltas?.therms_per_month}
                suffix=" therms"
                loading={simulating}
              />
            </div>

            {/* Comparison chart */}
            {deltas && (
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <h3 className="font-bold text-gray-900 mb-4">Before vs After</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={comparisonData} margin={{ left: 10 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="before" name="Current" fill="#d1d5db" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="after" name="After Changes" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Updated recommendations */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h3 className="font-bold text-gray-900 mb-3">
                {deltas ? "Updated " : ""}Recommendations
              </h3>
              {recs.length === 0 ? (
                <p className="text-gray-400 text-sm">Great job! No major upgrades recommended.</p>
              ) : (
                <div className="space-y-3">
                  {recs.map((rec, i) => (
                    <div key={rec.title} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
                      <span className="text-xs font-bold text-gray-300 mt-0.5">#{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm">{rec.title}</p>
                        <p className="text-xs text-gray-400">
                          Saves ~${rec.estimated_annual_savings?.toLocaleString()}/yr · {rec.upfront_cost_range}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {!deltas && (
              <div className="text-center py-8 text-gray-400 text-sm">
                Toggle upgrades on the left to see projected changes.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Toggle({ label, description, checked, original, onChange }) {
  const isChanged = checked !== original;
  return (
    <label className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors ${isChanged ? "bg-brand-50 border border-brand-200" : "hover:bg-gray-50"}`}>
      <div>
        <span className={`text-sm font-medium ${isChanged ? "text-brand-700" : "text-gray-700"}`}>{label}</span>
        <p className="text-xs text-gray-400">{description}</p>
      </div>
      <div
        onClick={(e) => { e.preventDefault(); onChange(!checked); }}
        className={`relative w-11 h-6 rounded-full transition-colors ${checked ? "bg-brand-500" : "bg-gray-200"}`}
      >
        <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? "translate-x-5.5 left-[1px]" : "left-[2px]"}`}
          style={{ transform: checked ? "translateX(22px)" : "translateX(0)" }}
        />
      </div>
    </label>
  );
}

function Slider({ label, value, min, max, step, format, onChange }) {
  return (
    <div className="mb-5">
      <div className="flex justify-between text-sm mb-1.5">
        <span className="font-medium text-gray-700">{label}</span>
        <span className="text-brand-600 font-semibold">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-brand-600"
      />
    </div>
  );
}

function DeltaCard({ label, before, after, delta, prefix = "", suffix = "", loading }) {
  const isNeg = delta < 0;
  const isZero = !delta || delta === 0;
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">
        {prefix}{typeof after === "number" ? after.toLocaleString() : after}{suffix}
      </p>
      {!isZero && (
        <p className={`text-sm font-semibold mt-1 ${isNeg ? "text-green-600" : "text-red-500"}`}>
          {isNeg ? "↓" : "↑"} {prefix}{Math.abs(delta).toLocaleString()}{suffix}
          <span className="font-normal text-gray-400"> vs current</span>
        </p>
      )}
      {loading && <div className="w-4 h-4 border-2 border-gray-200 border-t-brand-500 rounded-full animate-spin mt-2" />}
    </div>
  );
}
