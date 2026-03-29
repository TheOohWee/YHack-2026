"use client";

import type { EnergyLogPoint } from "@/types/energy";

type Props = {
  active?: boolean;
  payload?: { payload: EnergyLogPoint }[];
};

export function FuelMixTooltip({ active, payload }: Props) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const time = new Date(d.timestamp).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <div
      className="max-w-[280px] rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-4 py-3 text-base shadow-[var(--shadow-card)]"
      role="status"
    >
      <p className="mb-2 font-semibold text-[var(--text)]">{time}</p>
      <ul className="space-y-1.5 text-[var(--text-secondary)]">
        <li>
          <span className="text-[var(--text-muted)]">Coal:</span>{" "}
          <span className="tabular-nums text-[var(--text)]">
            {d.coal.toFixed(1)}%
          </span>
        </li>
        <li>
          <span className="text-[var(--text-muted)]">Natural gas:</span>{" "}
          <span className="tabular-nums text-[var(--text)]">
            {d.natural_gas.toFixed(1)}%
          </span>
        </li>
        <li>
          <span className="text-[var(--text-muted)]">Nuclear:</span>{" "}
          <span className="tabular-nums text-[var(--text)]">
            {d.nuclear.toFixed(1)}%
          </span>
        </li>
        <li>
          <span className="text-[var(--text-muted)]">Imports:</span>{" "}
          <span className="tabular-nums text-[var(--text)]">
            {d.imports.toFixed(1)}%
          </span>
        </li>
        <li>
          <span className="text-[var(--text-muted)]">Other:</span>{" "}
          <span className="tabular-nums text-[var(--text)]">
            {d.other.toFixed(1)}%
          </span>
        </li>
        <li>
          <span className="text-[var(--text-muted)]">Battery storage:</span>{" "}
          <span className="tabular-nums text-[var(--text)]">
            {d.battery_storage.toFixed(1)}%
          </span>
        </li>
        <li>
          <span className="text-[var(--text-muted)]">Wind:</span>{" "}
          <span className="tabular-nums text-[var(--text)]">
            {d.wind.toFixed(1)}%
          </span>
        </li>
        <li>
          <span className="text-[var(--text-muted)]">Solar:</span>{" "}
          <span className="tabular-nums text-[var(--text)]">
            {d.solar.toFixed(1)}%
          </span>
        </li>
        <li className="border-t border-[var(--border-soft)] pt-2 text-[var(--text-muted)]">
          Price about{" "}
          <span className="tabular-nums font-medium text-[var(--text)]">
            {d.price_cents.toFixed(2)}
          </span>{" "}
          ¢ per kWh
        </li>
      </ul>
    </div>
  );
}
