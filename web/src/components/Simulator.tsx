"use client";

import { useMemo, useState } from "react";

/** Simple what-if: shift fraction of monthly kWh from high-priced to lower-priced periods. */
export function Simulator() {
  const [hours, setHours] = useState(2);
  const [monthlyKwh] = useState(750);
  const [avgHigh] = useState(9);
  const [avgLow] = useState(4);

  const result = useMemo(() => {
    const shiftFrac = Math.min(1, hours / 24) * 0.35;
    const shiftedKwh = monthlyKwh * shiftFrac;
    const savings = (shiftedKwh * (avgHigh - avgLow)) / 100;
    const coavoid = shiftedKwh * 0.35 * 0.0004 * 1000;
    return { savings, coavoid };
  }, [hours, monthlyKwh, avgHigh, avgLow]);

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border-soft)] bg-[var(--surface)] p-6 shadow-[var(--shadow-card)]">
      <h2 className="text-lg font-semibold text-[var(--text)]">
        What if you shifted a little usage?
      </h2>
      <p className="mt-2 max-w-2xl text-base text-[var(--text-muted)]">
        Slide to imagine moving flexible chores by a few hours. This is a
        planning helper, not a promise on your bill.
      </p>
      <label htmlFor="shift-hours" className="mt-6 block text-base font-medium text-[var(--text-secondary)]">
        Hours to shift flexible usage
      </label>
      <input
        id="shift-hours"
        type="range"
        min={0}
        max={12}
        step={0.5}
        value={hours}
        onChange={(e) => setHours(Number(e.target.value))}
        className="mt-3 h-3 w-full max-w-xl cursor-pointer appearance-none rounded-full bg-[var(--surface-muted)] accent-[var(--accent)]"
      />
      <div className="mt-2 flex max-w-xl justify-between text-base text-[var(--text-muted)]">
        <span>Same-day timing</span>
        <span className="tabular-nums font-medium text-[var(--text)]">
          {hours} hours
        </span>
      </div>
      <div className="mt-6 max-w-xl rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-muted)] px-4 py-4">
        <p className="text-lg text-[var(--text)]">
          Rough monthly savings:{" "}
          <span className="font-semibold tabular-nums text-[var(--accent)]">
            ${result.savings.toFixed(2)}
          </span>
        </p>
        <p className="mt-2 text-base text-[var(--text-muted)]">
          Illustrative CO₂ avoided:{" "}
          <span className="tabular-nums text-[var(--text-secondary)]">
            {result.coavoid.toFixed(1)} kg
          </span>
        </p>
      </div>
    </div>
  );
}
