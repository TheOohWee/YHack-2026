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
      className="max-w-[240px] rounded-lg border border-slate-600 bg-slate-900/95 px-3 py-2 text-xs shadow-xl backdrop-blur"
      role="status"
    >
      <p className="mb-2 font-medium text-slate-200">{time}</p>
      <ul className="space-y-1 text-slate-300">
        <li>
          <span className="text-slate-400">Fossil:</span>{" "}
          <span className="tabular-nums">{d.fossil_pct.toFixed(1)}%</span>
        </li>
        <li>
          <span className="text-rose-300">Nuclear:</span>{" "}
          <span className="tabular-nums">{d.nuclear_pct.toFixed(1)}%</span>
        </li>
        <li>
          <span className="text-cyan-300">Hydro:</span>{" "}
          <span className="tabular-nums">{d.hydro_pct.toFixed(1)}%</span>
        </li>
        <li>
          <span className="text-violet-300">Other renew. + misc:</span>{" "}
          <span className="tabular-nums">{d.other_pct.toFixed(1)}%</span>
        </li>
        <li>
          <span className="text-sky-300">Wind:</span>{" "}
          <span className="tabular-nums">{d.wind_pct.toFixed(1)}%</span>
        </li>
        <li>
          <span className="text-amber-300">Solar:</span>{" "}
          <span className="tabular-nums">{d.solar_pct.toFixed(1)}%</span>
        </li>
        <li className="border-t border-slate-700 pt-1 text-slate-400">
          Price ~{" "}
          <span className="tabular-nums text-slate-200">
            {d.price_cents.toFixed(2)}
          </span>{" "}
          ¢
        </li>
      </ul>
    </div>
  );
}
