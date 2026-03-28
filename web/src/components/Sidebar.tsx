"use client";

import {
  Activity,
  BarChart3,
  LayoutDashboard,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

const nav = [
  { href: "#", label: "Command center", icon: LayoutDashboard, active: true },
  { href: "#grid", label: "Grid heartbeat", icon: Activity },
  { href: "#insights", label: "Agent insights", icon: Sparkles },
  { href: "#sim", label: "Simulator", icon: BarChart3 },
];

export function Sidebar() {
  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-slate-800 bg-slate-950/90 py-6 pl-4 pr-3">
      <div className="mb-8 flex items-center gap-2 px-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
          <Activity className="h-5 w-5" aria-hidden />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-100">WattsUp</p>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-1" aria-label="Primary">
        {nav.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
              item.active
                ? "bg-slate-800 text-white"
                : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
            }`}
          >
            <item.icon className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
            {item.label}
          </Link>
        ))}
      </nav>
      <p className="mt-auto px-2 text-[11px] leading-snug text-slate-600">
        Built for clarity, speed, and impact — not noise.
      </p>
    </aside>
  );
}
