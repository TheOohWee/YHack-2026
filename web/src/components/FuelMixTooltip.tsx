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
      className="max-w-[260px] rounded-lg border border-slate-600 bg-slate-900/95 px-3 py-2 text-xs shadow-xl backdrop-blur"
      role="status"
    >
      <p className="mb-2 font-medium text-slate-200">{time}</p>
      <ul className="space-y-1 text-slate-300">
        <li>
          <span className="text-stone-400">Coal:</span>{" "}
          <span className="tabular-nums">{d.coal.toFixed(1)}%</span>
        </li>
        <li>
          <span className="text-orange-300">Natural gas:</span>{" "}
          <span className="tabular-nums">{d.natural_gas.toFixed(1)}%</span>
        </li>
        <li>
          <span className="text-rose-300">Nuclear:</span>{" "}
          <span className="tabular-nums">{d.nuclear.toFixed(1)}%</span>
        </li>
        <li>
          <span className="text-sky-300">Imports:</span>{" "}
          <span className="tabular-nums">{d.imports.toFixed(1)}%</span>
        </li>
        <li>
          <span className="text-violet-300">Other:</span>{" "}
          <span className="tabular-nums">{d.other.toFixed(1)}%</span>
        </li>
        <li>
          <span className="text-fuchsia-300">Battery storage:</span>{" "}
          <span className="tabular-nums">{d.battery_storage.toFixed(1)}%</span>
        </li>
        <li>
          <span className="text-sky-200">Wind:</span>{" "}
          <span className="tabular-nums">{d.wind.toFixed(1)}%</span>
        </li>
        <li>
          <span className="text-amber-300">Solar:</span>{" "}
          <span className="tabular-nums">{d.solar.toFixed(1)}%</span>
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
