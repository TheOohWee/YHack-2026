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
      role="status"
      style={{
        maxWidth: "240px",
        background: "#071a0c",
        border: "2px solid var(--border-glow)",
        borderRadius: "4px",
        padding: "12px 16px",
        boxShadow: "4px 4px 0 rgba(0,0,0,0.60)",
        fontFamily: "var(--font-game)",
        fontSize: "11px",
      }}
    >
      <p style={{ marginBottom: "8px", fontWeight: "bold", color: "var(--pastel-mint)", letterSpacing: "0.08em" }}>{time}</p>
      <ul style={{ margin: 0, padding: 0, listStyle: "none", lineHeight: 1.8 }}>
        {[
          ["Coal",           d.coal,            "#6b5b5b"],
          ["Natural gas",    d.natural_gas,      "#c4a574"],
          ["Nuclear",        d.nuclear,          "#e9d5ff"],
          ["Imports",        d.imports,          "#bae6fd"],
          ["Other",          d.other,            "#a89bc9"],
          ["Battery",        d.battery_storage,  "#fce7f3"],
          ["Wind",           d.wind,             "#4ade80"],
          ["Solar",          d.solar,            "#fef08a"],
        ].map(([label, val, color]) => (
          <li key={label as string} style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
            <span style={{ color: color as string }}>{label as string}:</span>
            <span style={{ color: "var(--text)", fontWeight: "bold", tabularNums: "true" } as React.CSSProperties}>
              {(val as number).toFixed(1)}%
            </span>
          </li>
        ))}
        <li style={{ borderTop: "1px solid var(--border-soft)", paddingTop: "6px", marginTop: "4px", color: "var(--text-muted)", display: "flex", justifyContent: "space-between" }}>
          <span>Price</span>
          <span style={{ color: "var(--pastel-sky)", fontWeight: "bold" }}>{d.price_cents.toFixed(2)}¢</span>
        </li>
      </ul>
    </div>
  );
}
