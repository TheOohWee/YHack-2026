"use client";

import { DollarSign, Leaf } from "lucide-react";
import { motion } from "framer-motion";

export function ImpactCounters({
  dollars,
  carbonKg,
}: {
  dollars: number;
  carbonKg: number;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <motion.div
        className="rounded-xl border border-slate-700/80 bg-slate-900/50 px-4 py-3"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center gap-2 text-slate-400">
          <DollarSign className="h-4 w-4 text-emerald-400" aria-hidden />
          <span className="text-xs font-medium uppercase tracking-wide">
            Impact · Dollars
          </span>
        </div>
        <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-100">
          ${dollars.toLocaleString(undefined, { maximumFractionDigits: 2 })}
        </p>
        <p className="text-xs text-slate-500">Estimated cumulative savings</p>
      </motion.div>
      <motion.div
        className="rounded-xl border border-slate-700/80 bg-slate-900/50 px-4 py-3"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
      >
        <div className="flex items-center gap-2 text-slate-400">
          <Leaf className="h-4 w-4 text-emerald-400" aria-hidden />
          <span className="text-xs font-medium uppercase tracking-wide">
            Impact · CO₂
          </span>
        </div>
        <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-100">
          {carbonKg.toLocaleString(undefined, { maximumFractionDigits: 1 })} kg
        </p>
        <p className="text-xs text-slate-500">Avoided emissions (tracked)</p>
      </motion.div>
      <motion.div
        className="hidden rounded-xl border border-dashed border-emerald-500/30 bg-emerald-950/20 px-4 py-3 lg:block"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <p className="text-xs font-medium uppercase tracking-wide text-emerald-400/90">
          Social good
        </p>
        <p className="mt-1 text-sm text-slate-300">
          Every shifted kilowatt-hour is a tiny vote for cleaner air and fairer
          bills. You are not &ldquo;optimizing&rdquo; — you are participating.
        </p>
      </motion.div>
    </div>
  );
}
