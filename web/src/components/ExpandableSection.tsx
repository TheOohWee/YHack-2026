"use client";

type ExpandableSectionProps = {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
};

export function ExpandableSection({
  id,
  title,
  description,
  children,
  defaultOpen = false,
}: ExpandableSectionProps) {
  return (
    <details
      id={id}
      className="group rounded-sm transition-shadow"
      style={{
        background: "var(--surface-card)",
        border: "2px solid var(--border-soft)",
        boxShadow: "var(--shadow-card)",
      }}
      defaultOpen={defaultOpen}
    >
      <summary
        className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 text-left [&::-webkit-details-marker]:hidden"
        style={{ userSelect: "none" }}
      >
        <div>
          <span
            className="text-sm font-bold uppercase tracking-widest"
            style={{ color: "var(--text-secondary)", letterSpacing: "0.12em" }}
          >
            {title}
          </span>
          {description && (
            <p className="mt-1 text-[11px]" style={{ color: "var(--text-muted)" }}>
              {description}
            </p>
          )}
        </div>
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm text-sm font-bold transition-transform group-open:rotate-180"
          style={{
            background: "var(--surface-muted)",
            border: "2px solid var(--border-soft)",
            color: "var(--accent)",
          }}
          aria-hidden
        >
          ▼
        </span>
      </summary>
      <div
        className="px-6 pb-6 pt-2"
        style={{ borderTop: "1px solid var(--border-soft)" }}
      >
        {children}
      </div>
    </details>
  );
}