"use client";

import type { EnergyLogPoint } from "@/types/energy";

type ChartRow = EnergyLogPoint & { clean_share?: number };

type Props = {
  active?: boolean;
  payload?: { payload: ChartRow }[];
};

export function WindSolarTooltip({ active, payload }: Props) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const time = new Date(d.timestamp).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const wind = d.wind;
  const solar = d.solar;
  const combined =
    typeof d.clean_share === "number" && Number.isFinite(d.clean_share)
      ? d.clean_share
      : Math.min(100, wind + solar);

  return (
    <div
      className="max-w-[280px] rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-4 py-3 text-base shadow-[var(--shadow-card)]"
      role="status"
    >
      <p className="mb-2 font-semibold text-[var(--text)]">{time}</p>
      <ul className="space-y-1.5 text-[var(--text-secondary)]">
        <li>
          <span className="text-[var(--text-muted)]">Wind:</span>{" "}
          <span className="tabular-nums text-[var(--text)]">
            {wind.toFixed(1)}%
          </span>
        </li>
        <li>
          <span className="text-[var(--text-muted)]">Solar:</span>{" "}
          <span className="tabular-nums text-[var(--text)]">
            {solar.toFixed(1)}%
          </span>
        </li>
        <li className="border-t border-[var(--border-soft)] pt-2">
          <span className="text-[var(--text-muted)]">Wind + solar:</span>{" "}
          <span className="tabular-nums font-medium text-[var(--text)]">
            {combined.toFixed(1)}%
          </span>
        </li>
      </ul>
    </div>
  );
}
