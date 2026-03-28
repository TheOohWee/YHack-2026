"use client";
import Link from "next/link";
import Navbar from "../components/Navbar";

const FEATURES = [
  {
    icon: "📄",
    title: "Paste or Upload a Bill",
    desc: "Drop a PDF or paste text from your utility bill. AI extracts the data instantly.",
  },
  {
    icon: "🏠",
    title: "Describe Your Home",
    desc: "Tell us about your home in plain English. No forms, no dropdowns.",
  },
  {
    icon: "📊",
    title: "See Your Footprint",
    desc: "Detailed breakdown of energy use, monthly cost, and carbon impact.",
  },
  {
    icon: "💡",
    title: "Get Smart Recommendations",
    desc: "AI-ranked upgrades personalized to your home, climate, and budget.",
  },
  {
    icon: "🎛️",
    title: "What-If Simulator",
    desc: "Toggle upgrades and see costs change in real time.",
  },
  {
    icon: "🌱",
    title: "Track Your Impact",
    desc: "See your carbon footprint in trees, miles driven, and flights.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar
        actions={
          <Link
            href="/onboarding"
            className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-brand-700 transition"
          >
            Get Started
          </Link>
        }
      />

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 pt-20 pb-16">
        <div className="animate-fade-up">
          <div className="text-6xl mb-6">🏠⚡</div>
          <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight text-gray-900 leading-tight max-w-2xl">
            Understand your home&apos;s energy in{" "}
            <span className="text-brand-600">2 minutes</span>
          </h1>
          <p className="mt-6 text-lg text-gray-500 max-w-xl mx-auto leading-relaxed">
            Paste a utility bill or describe your home. Get a personalized energy
            profile, cost breakdown, carbon footprint, and actionable savings
            recommendations — powered by AI.
          </p>
        </div>
        <div className="mt-10 flex gap-4 animate-fade-up-delay">
          <Link
            href="/onboarding"
            className="bg-brand-600 text-white px-8 py-3.5 rounded-xl text-lg font-semibold hover:bg-brand-700 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-brand-600/20 transition-all"
          >
            Analyze My Home →
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="bg-gray-50 py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-12">
            How it works
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-md hover:-translate-y-1 transition-all"
              >
                <div className="text-3xl mb-3">{f.icon}</div>
                <h3 className="font-bold text-gray-900 mb-1">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 text-center text-sm text-gray-400">
        Built for hackathon demo — estimates are illustrative, not utility-grade.
      </footer>
    </div>
  );
}
