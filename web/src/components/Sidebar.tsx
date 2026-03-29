"use client";

import Link from "next/link";

const nav = [
  { href: "#overview",  label: "TODAY",      icon: "▶" },
  { href: "#grid",      label: "GRID RHYTHM", icon: "◈" },
  { href: "#insights",  label: "GUIDANCE",    icon: "◉" },
  { href: "#plan",      label: "PLAN AHEAD",  icon: "▷" },
  { href: "#records",   label: "BILLS",       icon: "▣" },
] as const;

export function Sidebar() {
  return (
    <aside
      className="flex w-full shrink-0 flex-row flex-wrap items-center gap-1 border-b px-4 py-4 sm:w-56 sm:flex-col sm:items-stretch sm:border-b-0 sm:border-r sm:py-10 sm:pl-6 sm:pr-4"
      style={{
        background: "var(--surface)",
        borderColor: "var(--border-soft)",
        boxShadow: "inset -3px 0 0 var(--border-soft)",
      }}
    >
      {/* Logo */}
      <div className="mb-0 px-2 sm:mb-8">
        <p
          className="text-xs font-bold tracking-widest"
          style={{ color: "var(--accent)", letterSpacing: "0.2em" }}
        >
          ⚡ WATTS.UP
        </p>
        <p
          className="hidden text-[10px] sm:block"
          style={{ color: "var(--text-muted)", letterSpacing: "0.15em" }}
        >
          HOME ENERGY
        </p>
      </div>

      {/* Pixel divider */}
      <div
        className="my-4 hidden h-px w-full sm:block"
        style={{ background: "var(--border-soft)" }}
      />

      {/* Nav */}
      <nav className="flex flex-row flex-wrap gap-1 sm:flex-col" aria-label="Primary">
        {nav.map((item, i) => (
          <Link
            key={item.label}
            href={item.href}
            className="group flex items-center gap-2 rounded-sm px-3 py-2.5 text-[11px] font-bold transition-all sm:px-4"
            style={{
              color: i === 0 ? "var(--accent)" : "var(--text-muted)",
              background: i === 0 ? "var(--accent-wash)" : "transparent",
              border: `2px solid ${i === 0 ? "var(--border-medium)" : "transparent"}`,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            <span style={{ color: i === 0 ? "var(--accent)" : "var(--text-muted)" }}>
              {item.icon}
            </span>
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Bottom tagline */}
      <div className="mt-auto hidden pt-8 sm:block">
        <div
          className="h-px w-full"
          style={{ background: "var(--border-soft)" }}
        />
        <p
          className="mt-4 text-[9px] leading-relaxed"
          style={{ color: "var(--text-muted)", letterSpacing: "0.12em", textTransform: "uppercase" }}
        >
          Clean power.<br />Steady bills.
        </p>
      </div>
    </aside>
  );
}
