"use client";

import { useState } from "react";

const steps = [
  {
    title: "When was this bill?",
    hint: "Pick the month your statement covers.",
  },
  {
    title: "What did you pay?",
    hint: "Use the total amount due before late fees.",
  },
  {
    title: "How much electricity?",
    hint: "Total kilowatt-hours from the bill, if shown.",
  },
] as const;

export function ManualBillSteps() {
  const [step, setStep] = useState(0);
  const [period, setPeriod] = useState("");
  const [amount, setAmount] = useState("");
  const [kwh, setKwh] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const canNext =
    (step === 0 && period.trim().length > 0) ||
    (step === 1 && amount.trim().length > 0) ||
    step === 2;

  const onSubmit = () => {
    setSubmitted(true);
  };

  const cardStyle = {
    background: "var(--surface-card)",
    border: "2px solid var(--border-soft)",
    boxShadow: "var(--shadow-card)",
  };

  if (submitted) {
    return (
      <div className="rounded-sm p-6" style={cardStyle}>
        <h2
          className="text-sm font-bold uppercase tracking-widest"
          style={{ color: "var(--accent)", letterSpacing: "0.15em" }}
        >
          ✓ Bill Saved
        </h2>
        <p className="mt-3 text-xs" style={{ color: "var(--text-muted)" }}>
          Your answers are saved on this device. When your account is linked, we match them to real usage.
        </p>
        <button
          type="button"
          className="btn-calm mt-6"
          onClick={() => { setSubmitted(false); setStep(0); setPeriod(""); setAmount(""); setKwh(""); }}
        >
          + Enter Another
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-sm p-6" style={cardStyle}>
      <h2
        className="text-sm font-bold uppercase tracking-widest"
        style={{ color: "var(--text-secondary)", letterSpacing: "0.15em" }}
      >
        Enter a Bill by Hand
      </h2>
      <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
        One short step at a time — no spreadsheet required.
      </p>

      {/* Progress bar */}
      <ol className="mt-5 flex gap-2" aria-label="Progress">
        {steps.map((_, i) => (
          <li key={i} className="flex-1">
            <span
              className="block h-2"
              style={{
                background: i <= step ? "var(--accent)" : "var(--border-soft)",
                boxShadow: i <= step ? "0 0 4px var(--accent)" : "none",
              }}
            />
          </li>
        ))}
      </ol>

      <p className="mt-3 text-[10px] uppercase" style={{ color: "var(--text-muted)", letterSpacing: "0.15em" }}>
        Step {step + 1} / {steps.length}
      </p>
      <h3 className="mt-2 text-sm font-bold" style={{ color: "var(--text)" }}>
        {steps[step].title}
      </h3>
      <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
        {steps[step].hint}
      </p>

      <div className="mt-5">
        {step === 0 && (
          <label className="block">
            <span className="sr-only">Billing period</span>
            <input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} className="input-calm w-full max-w-md" />
          </label>
        )}
        {step === 1 && (
          <label className="block">
            <span className="mb-2 block text-[11px] uppercase" style={{ color: "var(--text-muted)", letterSpacing: "0.1em" }}>Amount in dollars</span>
            <input type="text" inputMode="decimal" placeholder="e.g. 84.50" value={amount} onChange={(e) => setAmount(e.target.value)} className="input-calm w-full max-w-md" autoComplete="transaction-amount" />
          </label>
        )}
        {step === 2 && (
          <label className="block">
            <span className="mb-2 block text-[11px] uppercase" style={{ color: "var(--text-muted)", letterSpacing: "0.1em" }}>Kilowatt-hours (optional)</span>
            <input type="text" inputMode="numeric" placeholder="e.g. 620" value={kwh} onChange={(e) => setKwh(e.target.value)} className="input-calm w-full max-w-md" />
          </label>
        )}
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        {step > 0 && (
          <button type="button" className="btn-calm-secondary" onClick={() => setStep((s) => Math.max(0, s - 1))}>
            ◀ Back
          </button>
        )}
        {step < steps.length - 1 ? (
          <button type="button" className="btn-calm" disabled={!canNext} onClick={() => setStep((s) => s + 1)}>
            Continue ▶
          </button>
        ) : (
          <button type="button" className="btn-calm" onClick={onSubmit}>
            Save Summary ✓
          </button>
        )}
      </div>
    </div>
  );
}
