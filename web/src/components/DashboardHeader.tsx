"use client";

export function DashboardHeader({
  active,
  lastPollMinutesAgo,
  lastPolledLabel,
}: {
  active: boolean;
  lastPollMinutesAgo: number | null;
  lastPolledLabel: string;
}) {
  const stale = !active && lastPollMinutesAgo !== null && lastPollMinutesAgo >= 20;

  return (
    <header className="mb-10 pb-8" style={{ borderBottom: "2px solid var(--border-soft)" }}>
      {/* Title */}
      <h1
        className="text-3xl font-bold tracking-widest sm:text-4xl text-glow"
        style={{ color: "var(--pastel-mint)", letterSpacing: "0.12em", textTransform: "uppercase" }}
      >
        Energy Snapshot
      </h1>
      <p className="mt-2 max-w-2xl text-xs" style={{ color: "var(--text-muted)", letterSpacing: "0.08em" }}>
        LIVE GRID READINGS · PRICE INTEL · CLEAN POWER STATUS
      </p>

      {/* Status badge */}
      <div
        className="mt-5 inline-flex flex-wrap items-center gap-3 px-4 py-2 text-xs"
        style={{
          background: "var(--surface)",
          border: `2px solid ${active ? "var(--border-medium)" : "var(--border-soft)"}`,
          borderRadius: "var(--radius-card)",
          boxShadow: "var(--shadow-card)",
        }}
        role="status"
        aria-live="polite"
      >
        {/* animated dot */}
        <span
          className="inline-block h-2.5 w-2.5 rounded-sm"
          style={{
            background: active ? "var(--accent)" : "var(--text-muted)",
            boxShadow: active ? "0 0 6px var(--accent)" : "none",
            animation: active ? "blink 1.4s step-end infinite" : "none",
          }}
        />
        <span style={{ color: "var(--text-secondary)", letterSpacing: "0.05em", textTransform: "uppercase" }}>
          {active ? "SYNCING" : "STANDBY"}
        </span>
        <span style={{ color: "var(--border-medium)" }}>·</span>
        <span style={{ color: "var(--text-muted)" }}>
          LAST POLL: <span style={{ color: "var(--text-secondary)" }}>{lastPolledLabel.toUpperCase()}</span>
        </span>
        {stale && (
          <span
            className="px-2 py-0.5 text-[10px] font-bold"
            style={{
              background: "var(--warn-bg)",
              border: "1px solid var(--warn-border)",
              color: "var(--warn)",
              letterSpacing: "0.08em",
            }}
          >
            ⚠ DATA STALE
          </span>
        )}
      </div>
    </header>
  );
}
