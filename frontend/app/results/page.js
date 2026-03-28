"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function ResultsPage() {
  const router = useRouter();
  const [data, setData] = useState(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("wattwise_results");
    if (!raw) { router.push("/onboarding"); return; }
    setData(JSON.parse(raw));
  }, [router]);

  if (!data) return <div className="spinner" style={{ marginTop: 120 }} />;

  const { home, estimate, recommendations } = data;

  return (
    <div style={{ minHeight: "100vh", background: "var(--gray-50)" }}>
      <nav style={{ padding: "16px 24px", background: "#fff", borderBottom: "1px solid var(--gray-200)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: "var(--green-600)" }}>
          <span style={{ marginRight: 6 }}>&#9889;</span>WattWise
        </div>
        <button className="btn btn-secondary" style={{ padding: "8px 16px", fontSize: 14 }} onClick={() => router.push("/onboarding")}>
          New Analysis
        </button>
      </nav>

      <div className="container" style={{ paddingTop: 40, paddingBottom: 60 }}>
        {/* Summary stats */}
        <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 24 }} className="fade-in">Your Energy Profile</h2>

        <div className="stat-grid fade-in" style={{ marginBottom: 40 }}>
          <div className="stat-box">
            <div className="stat-value">{estimate.kwhPerMonth.toLocaleString()}</div>
            <div className="stat-label">kWh / month</div>
          </div>
          <div className="stat-box">
            <div className="stat-value" style={{ color: "var(--amber-500)" }}>${estimate.monthlyCost}</div>
            <div className="stat-label">estimated cost / month</div>
          </div>
          <div className="stat-box">
            <div className="stat-value" style={{ color: "var(--gray-600)" }}>{estimate.carbonKgPerMonth}</div>
            <div className="stat-label">kg CO&#8322; / month</div>
          </div>
        </div>

        {/* Home details chip */}
        <div className="card fade-in" style={{ marginBottom: 40, display: "flex", flexWrap: "wrap", gap: 12 }}>
          {[
            `${home.sqft.toLocaleString()} sq ft`,
            `${home.bedrooms} bed`,
            `Built ${home.yearBuilt}`,
            home.heating + " heat",
            home.hasAC && "AC",
            home.hasSolar && "Solar",
            home.hasPool && "Pool",
          ].filter(Boolean).map((tag) => (
            <span key={tag} style={{ padding: "6px 14px", background: "var(--green-50)", borderRadius: 20, fontSize: 13, fontWeight: 600, color: "var(--green-700)" }}>
              {tag}
            </span>
          ))}
        </div>

        {/* Breakdown */}
        <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }} className="fade-in">Cost Breakdown</h3>
        <div className="card fade-in" style={{ marginBottom: 40 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
            <span>Electricity ({estimate.kwhPerMonth} kWh)</span>
            <strong>${estimate.electricCost}/mo</strong>
          </div>
          {estimate.thermsPerMonth > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <span>Gas ({estimate.thermsPerMonth} therms)</span>
              <strong>${estimate.gasCost}/mo</strong>
            </div>
          )}
          <hr style={{ border: "none", borderTop: "1px solid var(--gray-200)", margin: "12px 0" }} />
          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 18 }}>
            <span>Total</span>
            <span>${estimate.monthlyCost}/mo</span>
          </div>
        </div>

        {/* Recommendations */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }} className="fade-in">
          <h3 style={{ fontSize: 20, fontWeight: 700 }}>Top Recommendations</h3>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 40 }}>
          {recommendations.map((rec, i) => (
            <div key={rec.id} className="card fade-in" style={{ borderLeft: `4px solid ${i === 0 ? "var(--green-500)" : i === 1 ? "var(--blue-500)" : "var(--amber-500)"}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 8 }}>
                <h4 style={{ fontSize: 17, fontWeight: 700 }}>
                  #{i + 1} {rec.title}
                </h4>
                {rec.estimatedAnnualSaving && (
                  <span style={{ fontWeight: 700, color: "var(--green-600)", fontSize: 15, whiteSpace: "nowrap" }}>
                    ~${rec.estimatedAnnualSaving}/yr saved
                  </span>
                )}
              </div>
              <p style={{ color: "var(--gray-500)", fontSize: 14, marginBottom: 12 }}>{rec.description}</p>
              <div style={{ display: "flex", gap: 16, fontSize: 13, color: "var(--gray-500)" }}>
                <span>Cost: <strong>{rec.costRange}</strong></span>
                <span>Payback: <strong>{rec.paybackYears} yr{rec.paybackYears !== 1 ? "s" : ""}</strong></span>
                <span>CO&#8322;: <strong>-{rec.carbonReduction}%</strong></span>
              </div>
            </div>
          ))}
        </div>

        <div style={{ textAlign: "center" }} className="fade-in">
          <button className="btn btn-primary" onClick={() => router.push("/simulator")}>
            Try What-If Simulator &rarr;
          </button>
        </div>
      </div>
    </div>
  );
}
