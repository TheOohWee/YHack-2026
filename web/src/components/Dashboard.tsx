"use client";

import type { EnergySnapshot } from "@/types/energy";
import { motion } from "framer-motion";
import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { AgentInsights } from "./AgentInsights";
import { DashboardHeader } from "./DashboardHeader";
import { EfficiencyDial } from "./EfficiencyDial";
import { GoldenWindowBanner } from "./GoldenWindowBanner";
import { GridHeartbeat } from "./GridHeartbeat";
import { ImpactCounters } from "./ImpactCounters";
import { PriceCard } from "./PriceCard";
import { Sidebar } from "./Sidebar";
import { Simulator } from "./Simulator";
import { SkeletonChart } from "./SkeletonChart";

const defaultUser =
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_WATTSUP_USER_ID
    ? process.env.NEXT_PUBLIC_WATTSUP_USER_ID
    : "test-user";

export function Dashboard() {
  const [userId, setUserId] = useState(defaultUser);
  const [snap, setSnap] = useState<EnergySnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch(`/api/energy/snapshot?userId=${encodeURIComponent(userId)}`, {
        cache: "no-store",
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Failed to load snapshot");
      setSnap(j as EnergySnapshot);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error");
      setSnap(null);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, [load]);

  const price = snap?.latest?.price_cents ?? null;
  const logs = snap?.logs ?? [];
  const prices = logs.map((l) => l.price_cents).filter(Number.isFinite);
  const mean24 =
    prices.length > 0
      ? prices.reduce((a, b) => a + b, 0) / prices.length
      : null;

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-950 via-slate-950 to-slate-900 text-slate-200">
      <Sidebar />
      <main className="flex flex-1 flex-col overflow-auto" id="main">
        <div className="border-b border-slate-800/80 bg-slate-950/40 px-4 py-3 sm:px-8">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex items-center gap-2 text-xs text-slate-400">
              User ID
              <input
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-100 outline-none focus:border-emerald-500/50"
                aria-describedby="user-help"
              />
            </label>
            <p id="user-help" className="sr-only">
              MongoDB user_id for energy_logs and user_stats
            </p>
            <button
              type="button"
              onClick={load}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-emerald-500/40 hover:text-white"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden />
              Refresh
            </button>
          </div>
        </div>

        <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-8">
          <DashboardHeader
            active={snap?.status.active ?? false}
            lastPollMinutesAgo={snap?.status.lastPollMinutesAgo ?? null}
          />

          {err && (
            <div
              className="mb-6 rounded-lg border border-amber-500/30 bg-amber-950/30 px-4 py-3 text-sm text-amber-100"
              role="alert"
            >
              {err}
            </div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 space-y-4"
          >
            <ImpactCounters
              dollars={snap?.stats.total_dollars_saved ?? 0}
              carbonKg={snap?.stats.total_carbon_saved_kg ?? 0}
            />
            {loading ? (
              <div className="h-24 animate-pulse rounded-xl bg-slate-800/50" />
            ) : (
              <PriceCard
                priceCents={price}
                avg24h={mean24}
                pulseAmber={snap?.pricePulseAmber ?? false}
                zScore={snap?.priceZScore ?? null}
              />
            )}
            <GoldenWindowBanner windows={snap?.goldenWindows ?? []} />
          </motion.div>

          <div className="grid gap-6 lg:grid-cols-2">
            <motion.section
              id="dial"
              className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 shadow-xl shadow-black/20 backdrop-blur-sm"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
            >
              {loading || !snap ? (
                <SkeletonChart />
              ) : (
                <EfficiencyDial snapshot={snap} />
              )}
            </motion.section>

            <motion.section
              id="grid"
              className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 shadow-xl shadow-black/20 backdrop-blur-sm"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <GridHeartbeat snapshot={snap} loading={loading} />
            </motion.section>

            <motion.section
              id="insights"
              className="min-h-[280px] rounded-2xl border border-slate-800 bg-slate-900/40 p-6 shadow-xl shadow-black/20 backdrop-blur-sm lg:col-span-2"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <AgentInsights text={snap?.insight ?? ""} />
            </motion.section>

            <motion.section
              id="sim"
              className="lg:col-span-2"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Simulator />
            </motion.section>
          </div>
        </div>
      </main>
    </div>
  );
}
