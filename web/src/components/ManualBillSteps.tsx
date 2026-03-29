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

  if (submitted) {
    return (
      <div className="rounded-[var(--radius-card)] border border-[var(--border-soft)] bg-[var(--surface)] p-6 shadow-[var(--shadow-card)]">
        <h2 className="text-lg font-semibold text-[var(--text)]">
          You&apos;re all set for this bill
        </h2>
        <p className="mt-3 text-base text-[var(--text-muted)]">
          Your answers are saved on this device for now. When your account is
          linked, we can match them to real usage.
        </p>
        <button
          type="button"
          className="btn-calm mt-6"
          onClick={() => {
            setSubmitted(false);
            setStep(0);
            setPeriod("");
            setAmount("");
            setKwh("");
          }}
        >
          Enter another bill
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border-soft)] bg-[var(--surface)] p-6 shadow-[var(--shadow-card)]">
      <h2 className="text-lg font-semibold text-[var(--text)]">
        Enter a bill by hand
      </h2>
      <p className="mt-2 text-base text-[var(--text-muted)]">
        One short step at a time — no spreadsheet required.
      </p>

      <ol className="mt-6 flex gap-2" aria-label="Progress">
        {steps.map((_, i) => (
          <li key={i} className="flex-1">
            <span
              className={`block h-2 rounded-full ${
                i <= step ? "bg-[var(--accent)]" : "bg-[var(--border-soft)]"
              }`}
            />
          </li>
        ))}
      </ol>

      <p className="mt-4 text-sm font-medium text-[var(--text-secondary)]">
        Step {step + 1} of {steps.length}
      </p>
      <h3 className="mt-2 text-xl font-semibold text-[var(--text)]">
        {steps[step].title}
      </h3>
      <p className="mt-1 text-base text-[var(--text-muted)]">
        {steps[step].hint}
      </p>

      <div className="mt-6">
        {step === 0 ? (
          <label className="block">
            <span className="sr-only">Billing period</span>
            <input
              type="month"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="input-calm w-full max-w-md"
            />
          </label>
        ) : null}
        {step === 1 ? (
          <label className="block">
            <span className="mb-2 block text-base text-[var(--text-secondary)]">
              Amount in dollars
            </span>
            <input
              type="text"
              inputMode="decimal"
              placeholder="e.g. 84.50"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="input-calm w-full max-w-md"
              autoComplete="transaction-amount"
            />
          </label>
        ) : null}
        {step === 2 ? (
          <label className="block">
            <span className="mb-2 block text-base text-[var(--text-secondary)]">
              Kilowatt-hours (optional)
            </span>
            <input
              type="text"
              inputMode="numeric"
              placeholder="e.g. 620"
              value={kwh}
              onChange={(e) => setKwh(e.target.value)}
              className="input-calm w-full max-w-md"
            />
          </label>
        ) : null}
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        {step > 0 ? (
          <button
            type="button"
            className="btn-calm-secondary min-h-[48px] min-w-[120px]"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
          >
            Back
          </button>
        ) : null}
        {step < steps.length - 1 ? (
          <button
            type="button"
            className="btn-calm min-h-[48px] min-w-[120px]"
            disabled={!canNext}
            onClick={() => setStep((s) => s + 1)}
          >
            Continue
          </button>
        ) : (
          <button
            type="button"
            className="btn-calm min-h-[48px] min-w-[140px]"
            onClick={onSubmit}
          >
            Save summary
          </button>
        )}
      </div>
    </div>
  );
}
