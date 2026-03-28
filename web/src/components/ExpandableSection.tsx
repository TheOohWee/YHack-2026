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
      className="group rounded-[var(--radius-card)] border border-[var(--border-soft)] bg-[var(--surface)] shadow-[var(--shadow-card)] transition-shadow open:shadow-[var(--shadow-card-hover)]"
      defaultOpen={defaultOpen}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 text-left [&::-webkit-details-marker]:hidden">
        <div>
          <span className="text-lg font-semibold text-[var(--text)]">
            {title}
          </span>
          {description ? (
            <p className="mt-1 text-base text-[var(--text-muted)]">
              {description}
            </p>
          ) : null}
        </div>
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--surface-muted)] text-[var(--text-secondary)] transition group-open:rotate-180"
          aria-hidden
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </span>
      </summary>
      <div className="border-t border-[var(--border-soft)] px-6 pb-6 pt-2">
        {children}
      </div>
    </details>
  );
}
