"use client";

import { Sun } from "lucide-react";

export function GoldenWindowBanner({
  windows,
}: {
  windows: { start: string; end: string }[];
}) {
  if (windows.length === 0) {
    return (
      <div className="rounded-[var(--radius-card)] border border-[var(--border-soft)] bg-[var(--surface-muted)] px-5 py-4">
        <p className="text-base text-[var(--text-muted)]">
          <span className="font-semibold text-[var(--text-secondary)]">
            Gentle hours:{" "}
          </span>
          In the last day we did not find a stretch with both strong renewables
          and a lower-than-usual price. Check back after the next reading.
        </p>
      </div>
    );
  }
  const fmt = (iso: string) =>
    new Date(iso).toLocaleString(undefined, {
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  return (
    <div
      className="flex flex-wrap items-start gap-3 rounded-[var(--radius-card)] border border-[var(--accent-soft)] bg-[var(--accent-wash)] px-5 py-4"
      role="status"
    >
      <Sun className="mt-0.5 h-6 w-6 shrink-0 text-[var(--warm-alert)]" aria-hidden />
      <div className="min-w-0 text-base text-[var(--text-secondary)]">
        <p className="font-semibold text-[var(--accent)]">
          Favorable windows in the last day
        </p>
        <ul className="mt-2 space-y-1">
          {windows.slice(0, 4).map((w) => (
            <li key={`${w.start}-${w.end}`}>
              {fmt(w.start)} — {fmt(w.end)}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
