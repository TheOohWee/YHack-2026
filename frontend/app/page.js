"use client";
import { useRouter } from "next/navigation";

export default function LandingPage() {
  const router = useRouter();

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Nav */}
      <nav style={{ padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--gray-100)" }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: "var(--green-600)" }}>
          <span style={{ marginRight: 6 }}>&#9889;</span>WattWise
        </div>
      </nav>

      {/* Hero */}
      <main className="container" style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", padding: "80px 24px" }}>
        <div className="fade-in">
          <div style={{ fontSize: 56, marginBottom: 16 }}>&#127968;&#9889;</div>
          <h1 style={{ fontSize: 44, fontWeight: 800, lineHeight: 1.15, marginBottom: 16, color: "var(--gray-900)" }}>
            Understand your home&apos;s<br />energy in 2 minutes
          </h1>
          <p style={{ fontSize: 18, color: "var(--gray-500)", maxWidth: 520, margin: "0 auto 40px" }}>
            Describe your home, paste a utility bill, and get personalized savings recommendations backed by data.
          </p>
          <button className="btn btn-primary" style={{ fontSize: 18, padding: "16px 40px" }} onClick={() => router.push("/onboarding")}>
            Get Started &rarr;
          </button>
        </div>

        {/* Feature cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, marginTop: 80, width: "100%", maxWidth: 720 }} className="fade-in">
          {[
            { icon: "&#128269;", title: "Describe Your Home", desc: "Plain English is fine. We extract the details." },
            { icon: "&#128200;", title: "See Your Footprint", desc: "Monthly kWh, cost, and carbon breakdown." },
            { icon: "&#128161;", title: "Get Recommendations", desc: "Top 3 upgrades ranked by savings & impact." },
          ].map((f) => (
            <div key={f.title} className="card" style={{ textAlign: "center" }}>
              <div style={{ fontSize: 32 }} dangerouslySetInnerHTML={{ __html: f.icon }} />
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: "12px 0 6px" }}>{f.title}</h3>
              <p style={{ fontSize: 14, color: "var(--gray-500)" }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
