"use client";

export function GoldenWindowBanner({ windows }: { windows: { start: string; end: string }[] }) {
  const fmt = (iso: string) =>
    new Date(iso).toLocaleString(undefined, {
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

  if (windows.length === 0) {
    return (
      <div
        className="flex items-start gap-3 rounded-sm px-5 py-4 text-xs"
        style={{
          background: "var(--surface-card)",
          border: "2px solid var(--border-soft)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <span style={{ color: "var(--text-muted)" }}>◈</span>
        <p style={{ color: "var(--text-muted)", letterSpacing: "0.04em" }}>
          <span className="font-bold" style={{ color: "var(--text-secondary)" }}>
            OPTIMAL WINDOWS:{" "}
          </span>
          No stretch found with both strong renewables and below-average price yet.
          Check back after the next reading.
        </p>
      </div>
    );
  }

  return (
    <div
      className="flex flex-wrap items-start gap-4 rounded-sm px-5 py-5"
      style={{
        background: "var(--accent-wash)",
        border: "2px solid var(--border-medium)",
        boxShadow: "4px 4px 0 rgba(34,197,94,0.20)",
      }}
      role="status"
    >
      {/* Left icon column */}
      <div className="flex flex-col items-center gap-1 pt-0.5">
        <span className="text-2xl">🌟</span>
        <div className="h-px w-6" style={{ background: "var(--border-medium)" }} />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p
          className="text-xs font-bold uppercase tracking-widest"
          style={{ color: "var(--accent)", letterSpacing: "0.18em" }}
        >
          ✦ OPTIMAL WINDOWS DETECTED
        </p>
        <p className="mt-1 text-[10px] uppercase" style={{ color: "var(--text-muted)", letterSpacing: "0.1em" }}>
          High renewables · Below-avg price
        </p>
        <ul className="mt-3 space-y-1.5">
          {windows.slice(0, 4).map((w) => (
            <li
              key={`${w.start}-${w.end}`}
              className="flex items-center gap-2 text-xs"
              style={{ color: "var(--pastel-mint)" }}
            >
              <span style={{ color: "var(--accent)" }}>▶</span>
              <span className="font-bold tabular-nums">
                {fmt(w.start)} → {fmt(w.end)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
