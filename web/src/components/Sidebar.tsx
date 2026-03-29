"use client";

import Link from "next/link";

const nav = [
  { href: "#overview", label: "Today" },
  { href: "#grid", label: "Grid rhythm" },
  { href: "#insights", label: "Guidance" },
  { href: "#plan", label: "Plan ahead" },
  { href: "#records", label: "Bills & files" },
] as const;

export function Sidebar() {
  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-[var(--border-soft)] bg-[var(--surface)]/90 py-5 pl-5 pr-4 backdrop-blur-sm sm:w-56 sm:border-b-0 sm:border-r sm:py-8 sm:pl-6">
      <div className="mb-8 px-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">
          WattsUp
        </p>
        <p className="mt-1 text-lg font-semibold text-[var(--text)]">
          Home energy
        </p>
      </div>
      <nav className="flex flex-row flex-wrap gap-2 sm:flex-col sm:gap-1" aria-label="Primary">
        {nav.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="rounded-full px-4 py-3 text-base font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--accent-wash)] hover:text-[var(--accent)] sm:py-2.5"
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <p className="mt-auto hidden pt-8 text-sm leading-relaxed text-[var(--text-muted)] sm:block">
        Made for steady bills and cleaner air — not noise.
      </p>
    </aside>
  );
}
