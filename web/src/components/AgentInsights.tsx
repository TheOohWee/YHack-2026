"use client";

import { Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export function AgentInsights({
  text,
  ecoZScore,
  ecoZScoreAlert,
  fromLlm,
}: {
  text: string;
  ecoZScore?: number | null;
  ecoZScoreAlert?: boolean;
  fromLlm?: boolean;
}) {
  const [shown, setShown] = useState("");

  useEffect(() => {
    setShown("");
    if (!text) return;
    let i = 0;
    const step = () => {
      i += 1;
      setShown(text.slice(0, i));
      if (i < text.length) {
        window.setTimeout(step, text.length > 200 ? 8 : 12);
      }
    };
    const t = window.setTimeout(step, 280);
    return () => window.clearTimeout(t);
  }, [text]);

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Sparkles className="h-4 w-4 text-emerald-400" aria-hidden />
        <h2 className="text-sm font-semibold text-slate-200">Agent insight</h2>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
            fromLlm
              ? "bg-emerald-500/20 text-emerald-300"
              : "bg-slate-700 text-slate-400"
          }`}
        >
          {fromLlm ? "Live (Lava / LLM)" : "Default tip"}
        </span>
      </div>
      <p className="mb-3 text-xs text-slate-400">
        {ecoZScore != null && Number.isFinite(ecoZScore) ? (
          <>
            Eco-efficiency z-score:{" "}
            <span
              className={`tabular-nums ${ecoZScoreAlert ? "font-semibold text-amber-300" : "text-slate-300"}`}
            >
              {ecoZScore.toFixed(2)}σ
            </span>
            {ecoZScoreAlert
              ? " — grid signal is unusually strong vs your recent baseline."
              : " — agent summary follows."}
          </>
        ) : (
          <>
            Guidance tuned for savings and lower carbon — written to be clear,
            not clever.
          </>
        )}
      </p>
      <motion.div
        className={`flex flex-1 rounded-xl border bg-gradient-to-br p-4 text-sm leading-relaxed text-slate-200 ${
          ecoZScoreAlert === true
            ? "border-amber-500/55 from-amber-950/35 to-slate-900/60 shadow-[0_0_28px_rgba(245,158,11,0.12)]"
            : "border-emerald-500/20 from-emerald-950/40 to-slate-900/60"
        }`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <p className="min-h-[6rem]">
          {shown}
          <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-emerald-400" />
        </p>
      </motion.div>
    </div>
  );
}
