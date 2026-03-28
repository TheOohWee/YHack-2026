"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "../../lib/api";

const STEPS = ["Describe Home", "Utility Bill", "Analyzing"];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [homeText, setHomeText] = useState("");
  const [billText, setBillText] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleAnalyze() {
    setStep(2);
    setLoading(true);
    try {
      const { home } = await api.parseHome(homeText);
      const { bill } = billText.trim() ? await api.parseBill(billText) : { bill: null };
      const { estimate } = await api.estimate(home, bill);
      const { recommendations } = await api.recommend(home, estimate);

      // Store results and navigate
      const data = JSON.stringify({ home, bill, estimate, recommendations });
      sessionStorage.setItem("wattwise_results", data);
      router.push("/results");
    } catch (err) {
      alert("Something went wrong: " + err.message);
      setStep(0);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--gray-50)" }}>
      <nav style={{ padding: "16px 24px", background: "#fff", borderBottom: "1px solid var(--gray-200)" }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: "var(--green-600)" }}>
          <span style={{ marginRight: 6 }}>&#9889;</span>WattWise
        </div>
      </nav>

      <div className="container" style={{ paddingTop: 48, maxWidth: 640 }}>
        {/* Progress */}
        <div className="progress-bar">
          {STEPS.map((_, i) => (
            <div key={i} className={`progress-step ${i <= step ? "active" : ""}`} />
          ))}
        </div>

        {/* Step 0: Home description */}
        {step === 0 && (
          <div className="fade-in">
            <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Tell us about your home</h2>
            <p style={{ color: "var(--gray-500)", marginBottom: 24 }}>
              Describe it in plain English &mdash; size, age, heating type, features.
            </p>
            <textarea
              value={homeText}
              onChange={(e) => setHomeText(e.target.value)}
              placeholder="e.g. 2,200 sq ft ranch built in 1985. Gas heating, central AC, no solar. 3 bedrooms, has a pool."
              style={{ minHeight: 150, marginBottom: 24 }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button className="btn btn-primary" disabled={!homeText.trim()} onClick={() => setStep(1)}>
                Next &rarr;
              </button>
            </div>
          </div>
        )}

        {/* Step 1: Utility bill */}
        {step === 1 && (
          <div className="fade-in">
            <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Paste your utility bill</h2>
            <p style={{ color: "var(--gray-500)", marginBottom: 24 }}>
              Copy any text from your electric or gas bill. This is optional but improves accuracy.
            </p>
            <textarea
              value={billText}
              onChange={(e) => setBillText(e.target.value)}
              placeholder="e.g. Total amount due: $187.43. Usage: 1,240 kWh. Service period: Feb 1 - Mar 1."
              style={{ minHeight: 150, marginBottom: 24 }}
            />
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <button className="btn btn-secondary" onClick={() => setStep(0)}>&larr; Back</button>
              <button className="btn btn-primary" onClick={handleAnalyze}>
                {billText.trim() ? "Analyze" : "Skip & Analyze"} &rarr;
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Loading */}
        {step === 2 && (
          <div className="fade-in" style={{ textAlign: "center", paddingTop: 60 }}>
            <div className="spinner" />
            <h2 style={{ fontSize: 24, fontWeight: 700, marginTop: 24 }}>Analyzing your home...</h2>
            <p style={{ color: "var(--gray-500)", marginTop: 8 }}>Crunching the numbers. This takes just a moment.</p>
          </div>
        )}
      </div>
    </div>
  );
}
