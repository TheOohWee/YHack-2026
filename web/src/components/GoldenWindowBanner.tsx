"use client";

import { Sun } from "lucide-react";

export function GoldenWindowBanner({
  windows,
}: {
  windows: { start: string; end: string }[];
}) {
  if (windows.length === 0) {
    return (
      <p className="text-xs text-slate-500">
        <span className="font-medium text-emerald-400/90">Golden window: </span>
        no span in the last 24h met &gt;60% renewables and below-median price.
        Check back after more polls.
      </p>
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
      className="flex flex-wrap items-start gap-2 rounded-lg border border-emerald-500/25 bg-emerald-950/25 px-3 py-2"
      role="status"
    >
      <Sun className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" aria-hidden />
      <div className="text-xs text-slate-300">
        <p className="font-medium text-emerald-300">Golden windows (24h)</p>
        <ul className="mt-1 space-y-0.5 text-slate-400">
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
