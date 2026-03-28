"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Navbar from "../../components/Navbar";

// Lazy-load recharts to avoid SSR issues
const PieChart = dynamic(() => import("recharts").then((m) => m.PieChart), { ssr: false });
const Pie = dynamic(() => import("recharts").then((m) => m.Pie), { ssr: false });
const Cell = dynamic(() => import("recharts").then((m) => m.Cell), { ssr: false });
const BarChart = dynamic(() => import("recharts").then((m) => m.BarChart), { ssr: false });
const Bar = dynamic(() => import("recharts").then((m) => m.Bar), { ssr: false });
const XAxis = dynamic(() => import("recharts").then((m) => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then((m) => m.YAxis), { ssr: false });
const Tooltip = dynamic(() => import("recharts").then((m) => m.Tooltip), { ssr: false });
const ResponsiveContainer = dynamic(() => import("recharts").then((m) => m.ResponsiveContainer), { ssr: false });

const COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899"];

const EFFORT_BADGE = {
  low: { label: "Easy", color: "bg-green-100 text-green-700" },
  medium: { label: "Moderate", color: "bg-amber-100 text-amber-700" },
  high: { label: "Major Project", color: "bg-red-100 text-red-700" },
};

export default function ResultsPage() {
  const router = useRouter();
  const [data, setData] = useState(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("wattwise_results");
    if (!raw) {
      router.push("/onboarding");
      return;
    }
    setData(JSON.parse(raw));
  }, [router]);

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-gray-200 border-t-brand-500 rounded-full animate-spin-slow" />
      </div>
    );
  }

  const { home, estimate, recommendations } = data;

  // Prepare chart data
  const breakdownData = Object.entries(estimate.breakdown || {})
    .filter(([, v]) => v > 0)
    .map(([key, value]) => ({
      name: key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      value,
    }))
    .sort((a, b) => b.value - a.value);

  const savingsData = recommendations.map((r) => ({
    name: r.title.length > 20 ? r.title.slice(0, 20) + "..." : r.title,
    savings: r.estimated_annual_savings,
    carbon: r.estimated_carbon_reduction_kg,
  }));

  const treesEquiv = estimate.carbon_trees_equivalent || 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar
        actions={
          <>
            <button
              onClick={() => router.push("/simulator")}
              className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-brand-700 transition"
            >
              What-If Simulator
            </button>
            <button
              onClick={() => router.push("/onboarding")}
              className="text-gray-500 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-100 transition"
            >
              New Analysis
            </button>
          </>
        }
      />

      <div className="max-w-5xl mx-auto px-6 pt-8 pb-20">
        {/* Hero stats */}
        <h1 className="text-3xl font-bold text-gray-900 mb-6 animate-fade-up">
          Your Energy Profile
        </h1>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 animate-fade-up">
          <StatCard value={estimate.kwh_per_month.toLocaleString()} unit="kWh/mo" label="Electricity" color="text-brand-600" />
          <StatCard value={estimate.therms_per_month} unit="therms/mo" label="Natural Gas" color="text-blue-600" />
          <StatCard value={`$${estimate.total_monthly_cost}`} label="Estimated Cost" color="text-amber-600" />
          <StatCard value={estimate.carbon_kg_per_month} unit="kg" label="CO₂/month" color="text-gray-600" />
        </div>

        {/* Carbon equivalence */}
        <div className="bg-brand-50 border border-brand-100 rounded-2xl p-5 mb-8 animate-fade-up-delay">
          <p className="text-brand-800 text-sm">
            <strong>Your carbon footprint</strong> of {estimate.carbon_kg_per_month} kg CO₂/month is equivalent to{" "}
            <strong>{treesEquiv} trees needed per year</strong> to offset, or driving{" "}
            <strong>{Math.round(estimate.carbon_kg_per_month * 12 / 0.404).toLocaleString()} miles/year</strong> in a gas car.
          </p>
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10 animate-fade-up-delay">
          {/* Breakdown pie */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h3 className="font-bold text-gray-900 mb-4">Energy Breakdown</h3>
            {breakdownData.length > 0 && (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={breakdownData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={3}>
                    {breakdownData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => `${v} kWh-eq`} />
                </PieChart>
              </ResponsiveContainer>
            )}
            <div className="flex flex-wrap gap-3 mt-2">
              {breakdownData.map((d, i) => (
                <div key={d.name} className="flex items-center gap-1.5 text-xs text-gray-500">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                  {d.name}
                </div>
              ))}
            </div>
          </div>

          {/* Cost breakdown */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h3 className="font-bold text-gray-900 mb-4">Monthly Cost Breakdown</h3>
            <div className="space-y-4 mt-6">
              <CostRow label="Electricity" detail={`${estimate.kwh_per_month.toLocaleString()} kWh`} amount={estimate.electric_cost} />
              {estimate.therms_per_month > 0 && (
                <CostRow label="Natural Gas" detail={`${estimate.therms_per_month} therms`} amount={estimate.gas_cost} />
              )}
              <div className="border-t border-gray-100 pt-4 flex justify-between items-center">
                <span className="font-bold text-gray-900 text-lg">Total</span>
                <span className="font-bold text-gray-900 text-xl">${estimate.total_monthly_cost}/mo</span>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                ${(estimate.total_monthly_cost * 12).toLocaleString()}/year estimated
              </p>
            </div>
          </div>
        </div>

        {/* Home profile chips */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-10 animate-fade-up-delay-2">
          <h3 className="font-bold text-gray-900 mb-3 text-sm">Detected Home Profile</h3>
          <div className="flex flex-wrap gap-2">
            {[
              home.sqft && `${home.sqft.toLocaleString()} sq ft`,
              home.bedrooms && `${home.bedrooms} bed`,
              home.bathrooms && `${home.bathrooms} bath`,
              home.year_built && `Built ${home.year_built}`,
              home.heating_type && `${home.heating_type.replace(/_/g, " ")} heat`,
              home.cooling_type && home.cooling_type !== "none" && home.cooling_type.replace(/_/g, " "),
              home.has_solar && "Solar",
              home.has_pool && "Pool",
              home.has_ev && "EV",
              home.zip_code && `ZIP ${home.zip_code}`,
            ]
              .filter(Boolean)
              .map((tag) => (
                <span key={tag} className="px-3 py-1 bg-brand-50 text-brand-700 rounded-full text-xs font-semibold">
                  {tag}
                </span>
              ))}
          </div>
        </div>

        {/* Recommendations */}
        <h2 className="text-2xl font-bold text-gray-900 mb-4 animate-fade-up-delay-2">
          Top Recommendations
        </h2>
        <div className="space-y-4 mb-10">
          {recommendations.map((rec, i) => {
            const badge = EFFORT_BADGE[rec.effort_level] || EFFORT_BADGE.medium;
            return (
              <div
                key={rec.rank || i}
                className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-md transition-shadow animate-fade-up-delay-2"
                style={{ borderLeftWidth: 4, borderLeftColor: COLORS[i] }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-gray-400">#{i + 1}</span>
                    <h3 className="font-bold text-gray-900">{rec.title}</h3>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badge.color}`}>
                      {badge.label}
                    </span>
                  </div>
                  <span className="text-brand-600 font-bold whitespace-nowrap">
                    ~${rec.estimated_annual_savings?.toLocaleString()}/yr
                  </span>
                </div>
                <p className="text-gray-500 text-sm mb-3">{rec.description}</p>
                <div className="flex flex-wrap gap-4 text-xs text-gray-400">
                  <span>Cost: <strong className="text-gray-600">{rec.upfront_cost_range}</strong></span>
                  <span>Payback: <strong className="text-gray-600">{rec.payback_years} yrs</strong></span>
                  <span>CO₂: <strong className="text-gray-600">-{rec.estimated_carbon_reduction_kg?.toLocaleString()} kg/yr</strong></span>
                  <span>Category: <strong className="text-gray-600 capitalize">{rec.category}</strong></span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Savings comparison chart */}
        {savingsData.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-10 animate-fade-up-delay-2">
            <h3 className="font-bold text-gray-900 mb-4">Potential Annual Savings</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={savingsData} layout="vertical" margin={{ left: 10 }}>
                <XAxis type="number" tickFormatter={(v) => `$${v}`} />
                <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => `$${v}`} />
                <Bar dataKey="savings" fill="#22c55e" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* CTA */}
        <div className="text-center animate-fade-up-delay-2">
          <button
            onClick={() => router.push("/simulator")}
            className="bg-brand-600 text-white px-8 py-3.5 rounded-xl text-lg font-semibold hover:bg-brand-700 hover:shadow-lg transition-all"
          >
            Try the What-If Simulator →
          </button>
          <p className="text-xs text-gray-400 mt-3">
            Toggle upgrades and see how your costs and carbon change in real time.
          </p>
        </div>
      </div>
    </div>
  );
}

function StatCard({ value, unit, label, color }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 text-center">
      <div className={`text-2xl font-bold ${color}`}>
        {value}
        {unit && <span className="text-sm font-medium text-gray-400 ml-1">{unit}</span>}
      </div>
      <div className="text-xs text-gray-400 mt-1">{label}</div>
    </div>
  );
}

function CostRow({ label, detail, amount }) {
  return (
    <div className="flex justify-between items-center">
      <div>
        <span className="text-gray-700 font-medium">{label}</span>
        <span className="text-gray-400 text-sm ml-2">{detail}</span>
      </div>
      <span className="font-semibold text-gray-900">${amount}</span>
    </div>
  );
}
