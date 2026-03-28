"use client";

import { Radio } from "lucide-react";
import { motion } from "framer-motion";

export function DashboardHeader({
  active,
  lastPollMinutesAgo,
  lastPolledLabel,
}: {
  active: boolean;
  lastPollMinutesAgo: number | null;
  lastPolledLabel: string;
}) {
  return (
    <header className="mb-6 flex flex-col gap-4 border-b border-slate-800 pb-6 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-100 sm:text-2xl">
          Energy command center
        </h1>
      </div>
      <div className="flex items-center gap-3">
        <motion.div
          className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${
            active
              ? "border-emerald-500/40 bg-emerald-950/50 text-emerald-300"
              : "border-slate-700 bg-slate-900 text-slate-400"
          }`}
          layout
          role="status"
          aria-live="polite"
        >
          <Radio
            className={`h-3.5 w-3.5 ${active ? "text-emerald-400" : "text-slate-500"}`}
            aria-hidden
          />
          <span>{active ? "Agent active · polling" : "Awaiting fresh poll"}</span>
          <span className="text-slate-500">· Last polled {lastPolledLabel}</span>
          {!active && lastPollMinutesAgo !== null && lastPollMinutesAgo >= 20 && (
            <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] text-amber-300">
              stale
            </span>
          )}
        </motion.div>
        {active && (
          <motion.span
            className="hidden h-2 w-2 rounded-full bg-emerald-400 sm:block"
            animate={{ scale: [1, 1.2, 1], opacity: [1, 0.7, 1] }}
            transition={{ duration: 1.8, repeat: Infinity }}
            aria-hidden
          />
        )}
      </div>
    </header>
  );
}
