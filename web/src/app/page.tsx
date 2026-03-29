import Link from "next/link";
import { Zap, TrendingDown, Leaf } from "lucide-react";

export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="max-w-lg">
        {/* Hero */}
        <Zap
          size={36}
          strokeWidth={2.2}
          style={{ color: "var(--accent)" }}
          className="mx-auto mb-5"
        />

        <h1
          className="text-5xl font-bold tracking-tight sm:text-6xl"
          style={{ color: "var(--text)" }}
        >
          WattsUp
        </h1>
        <p
          className="mt-4 text-lg leading-relaxed"
          style={{ color: "var(--text-secondary)" }}
        >
          Real-time grid insights to save money
          <br />
          and shrink your carbon footprint.
        </p>

        {/* Features */}
        <div className="mt-10 flex justify-center gap-8 sm:gap-12">
          {[
            { icon: Zap, label: "Live grid signals" },
            { icon: TrendingDown, label: "Lower your bills" },
            { icon: Leaf, label: "Track carbon" },
          ].map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex flex-col items-center gap-1.5"
            >
              <Icon
                size={20}
                style={{ color: "var(--accent)" }}
              />
              <span
                className="text-xs font-medium"
                style={{ color: "var(--text-secondary)" }}
              >
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* CTAs */}
        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link href="/auth?mode=signin" className="btn-calm">
            Sign in
          </Link>
          <Link href="/auth?mode=signup" className="btn-calm-secondary">
            Register
          </Link>
        </div>
      </div>
    </main>
  );
}
