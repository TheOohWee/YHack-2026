"use client";

export function SkeletonChart({ className = "" }: { className?: string }) {
  return (
    <div
      className={`space-y-4 ${className}`}
      role="status"
      aria-label="Loading chart"
    >
      <div
        className="h-40 w-full animate-pulse rounded-sm"
        style={{ background: "var(--surface-muted)", border: "1px solid var(--border-soft)" }}
      />
      <div className="flex gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-2 flex-1 animate-pulse"
            style={{
              background: "var(--border-soft)",
              animationDelay: `${i * 80}ms`,
            }}
          />
        ))}
      </div>
      <p className="text-center text-[10px] uppercase" style={{ color: "var(--text-muted)", letterSpacing: "0.2em" }}>
        LOADING<span className="blink">_</span>
      </p>
    </div>
  );
}
