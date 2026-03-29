"use client";

export function StatTooltip({ tip }: { tip: string }) {
  return (
    <span className="stat-tooltip-wrap ml-2 shrink-0">
      <span
        className="inline-flex h-5 w-5 cursor-help items-center justify-center rounded-sm border text-[10px] font-bold transition-colors"
        style={{
          background: "var(--surface-muted)",
          borderColor: "var(--border-medium)",
          color: "var(--text-muted)",
          fontFamily: "var(--font-game)",
        }}
        aria-label="More info"
      >
        ?
      </span>
      <span className="stat-tooltip-popup">{tip}</span>
    </span>
  );
}
