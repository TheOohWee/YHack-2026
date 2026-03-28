"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "../../lib/api";

export default function SimulatorPage() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [simHome, setSimHome] = useState(null);
  const [simEstimate, setSimEstimate] = useState(null);
  const [simRecs, setSimRecs] = useState([]);

  useEffect(() => {
    const raw = sessionStorage.getItem("wattwise_results");
    if (!raw) { router.push("/onboarding"); return; }
    const parsed = JSON.parse(raw);
    setData(parsed);
    setSimHome({ ...parsed.home });
    setSimEstimate(parsed.estimate);
    setSimRecs(parsed.recommendations);
  }, [router]);

  const recalculate = useCallback(async (home) => {
    try {
      const { estimate } = await api.estimate(home, data?.bill);
      const { recommendations } = await api.recommend(home, estimate);
      setSimEstimate(estimate);
      setSimRecs(recommendations);
    } catch { /* ignore */ }
  }, [data]);

  function update(field, value) {
    const updated = { ...simHome, [field]: value };
    setSimHome(updated);
    recalculate(updated);
  }

  if (!data || !simHome || !simEstimate) return <div className="spinner" style={{ marginTop: 120 }} />;

  const original = data.estimate;
  const costDiff = simEstimate.monthlyCost - original.monthlyCost;
  const carbonDiff = simEstimate.carbonKgPerMonth - original.carbonKgPerMonth;

  return (
    <div style={{ minHeight: "100vh", background: "var(--gray-50)" }}>
      <nav style={{ padding: "16px 24px", background: "#fff", borderBottom: "1px solid var(--gray-200)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: "var(--green-600)" }}>
          <span style={{ marginRight: 6 }}>&#9889;</span>WattWise
        </div>
        <button className="btn btn-secondary" style={{ padding: "8px 16px", fontSize: 14 }} onClick={() => router.push("/results")}>
          &larr; Back to Results
        </button>
      </nav>

      <div className="container" style={{ paddingTop: 40, paddingBottom: 60 }}>
        <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }} className="fade-in">What-If Simulator</h2>
        <p style={{ color: "var(--gray-500)", marginBottom: 32 }} className="fade-in">
          Toggle upgrades and see how your energy profile changes in real time.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          {/* Controls */}
          <div className="fade-in">
            <div className="card" style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Adjust Your Home</h3>

              <div style={{ marginBottom: 16 }}>
                <label>Heating Type</label>
                <select value={simHome.heating} onChange={(e) => update("heating", e.target.value)}>
                  <option value="gas">Gas</option>
                  <option value="electric">Electric</option>
                  <option value="heat pump">Heat Pump</option>
                  <option value="oil">Oil</option>
                  <option value="propane">Propane</option>
                </select>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label>Square Footage: {simHome.sqft.toLocaleString()}</label>
                <input type="range" min="500" max="5000" step="100" value={simHome.sqft}
                  onChange={(e) => update("sqft", parseInt(e.target.value, 10))} />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label>Year Built: {simHome.yearBuilt}</label>
                <input type="range" min="1920" max="2024" step="1" value={simHome.yearBuilt}
                  onChange={(e) => update("yearBuilt", parseInt(e.target.value, 10))} />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[
                  { field: "hasSolar", label: "Add Solar Panels" },
                  { field: "hasAC", label: "Has Air Conditioning" },
                  { field: "hasPool", label: "Has Pool" },
                ].map(({ field, label }) => (
                  <label key={field} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 15, fontWeight: 400 }}>
                    <input type="checkbox" checked={simHome[field]}
                      onChange={(e) => update(field, e.target.checked)}
                      style={{ width: 18, height: 18, accentColor: "var(--green-600)" }} />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Live results */}
          <div className="fade-in">
            <div className="card" style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Projected Impact</h3>

              <div className="stat-grid" style={{ gridTemplateColumns: "1fr 1fr", marginBottom: 16 }}>
                <div className="stat-box">
                  <div className="stat-value" style={{ fontSize: 26 }}>${simEstimate.monthlyCost}</div>
                  <div className="stat-label">cost / month</div>
                </div>
                <div className="stat-box">
                  <div className="stat-value" style={{ fontSize: 26, color: "var(--gray-600)" }}>{simEstimate.carbonKgPerMonth}</div>
                  <div className="stat-label">kg CO&#8322; / month</div>
                </div>
              </div>

              {/* Delta */}
              <div style={{ display: "flex", gap: 12 }}>
                <DeltaChip value={costDiff} label="/mo" prefix="$" />
                <DeltaChip value={carbonDiff} label=" kg CO&#8322;" />
              </div>
            </div>

            {/* Updated recs */}
            <div className="card">
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Updated Recommendations</h3>
              {simRecs.length === 0 && <p style={{ color: "var(--gray-400)", fontSize: 14 }}>Looking good! No major upgrades needed.</p>}
              {simRecs.map((rec, i) => (
                <div key={rec.id} style={{ padding: "10px 0", borderBottom: i < simRecs.length - 1 ? "1px solid var(--gray-100)" : "none" }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>#{i + 1} {rec.title}</div>
                  <div style={{ fontSize: 13, color: "var(--gray-500)" }}>
                    Saves ~{rec.savingsPercent}% &middot; {rec.costRange}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DeltaChip({ value, label, prefix = "" }) {
  const isPositive = value > 0;
  const isZero = value === 0;
  const color = isZero ? "var(--gray-500)" : isPositive ? "var(--red-500)" : "var(--green-600)";
  const bg = isZero ? "var(--gray-50)" : isPositive ? "#fef2f2" : "var(--green-50)";
  const sign = isZero ? "" : isPositive ? "+" : "";
  return (
    <div style={{ flex: 1, textAlign: "center", padding: "10px", borderRadius: 10, background: bg, color, fontWeight: 700, fontSize: 15 }}>
      {sign}{prefix}{Math.abs(value)}<span style={{ fontWeight: 400, fontSize: 13 }} dangerouslySetInnerHTML={{ __html: label }} />
    </div>
  );
}
