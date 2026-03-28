"use client";

import { motion } from "framer-motion";
import { Zap } from "lucide-react";

export function PriceCard({
  priceCents,
  avg24h,
  pulseAmber,
  zScore,
}: {
  priceCents: number | null;
  avg24h: number | null;
  pulseAmber: boolean;
  zScore: number | null;
}) {
  return (
    <motion.div
      className={`rounded-xl border px-4 py-3 transition-shadow ${
        pulseAmber
          ? "border-amber-500/60 bg-amber-950/30 shadow-[0_0_24px_rgba(245,158,11,0.18)]"
          : "border-slate-700/80 bg-slate-900/50"
      }`}
      animate={
        pulseAmber
          ? {
              boxShadow: [
                "0 0 20px rgba(245,158,11,0.12)",
                "0 0 32px rgba(245,158,11,0.28)",
                "0 0 20px rgba(245,158,11,0.12)",
              ],
            }
          : {}
      }
      transition={
        pulseAmber ? { duration: 2.2, repeat: Infinity, ease: "easeInOut" } : {}
      }
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Zap
            className={`h-4 w-4 ${pulseAmber ? "text-amber-400" : "text-slate-400"}`}
            aria-hidden
          />
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              ComEd RT price
            </p>
            <p className="text-xl font-semibold tabular-nums text-slate-100">
              {priceCents != null ? `${priceCents.toFixed(2)}¢` : "—"}
            </p>
          </div>
        </div>
        <div className="text-right text-xs text-slate-400">
          <p>
            24h mean:{" "}
            <span className="tabular-nums text-slate-300">
              {avg24h != null ? `${avg24h.toFixed(2)}¢` : "—"}
            </span>
          </p>
          <p className="mt-0.5">
            σ vs window:{" "}
            <span className="tabular-nums text-slate-300">
              {zScore != null ? zScore.toFixed(2) : "—"}
            </span>
          </p>
        </div>
      </div>
      {pulseAmber && (
        <p className="mt-2 text-[11px] text-amber-200/90">
          Price is elevated vs the last day of readings — a gentle nudge to defer
          heavy loads if you can.
        </p>
      )}
    </motion.div>
  );
}
