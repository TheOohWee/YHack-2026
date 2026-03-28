"use client";

export function SkeletonChart({ className = "" }: { className?: string }) {
  return (
    <div
      className={`space-y-4 ${className}`}
      role="status"
      aria-label="Loading chart"
    >
      <div className="h-40 w-full animate-pulse rounded-2xl bg-[var(--surface-muted)]" />
      <div className="flex gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-2 flex-1 animate-pulse rounded-full bg-[var(--border-soft)]"
            style={{ animationDelay: `${i * 80}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
