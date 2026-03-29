"use client";

import { loadEnergySnapshot } from "@/app/actions";
import type { EnergySnapshot } from "@/types/energy";
import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { AgentInsights } from "./AgentInsights";
import { BillUploadPanel } from "./BillUploadPanel";
import { DashboardHeader } from "./DashboardHeader";
import { EfficiencyDial } from "./EfficiencyDial";
import { ExpandableSection } from "./ExpandableSection";
import { GoldenWindowBanner } from "./GoldenWindowBanner";
import { GridHeartbeat } from "./GridHeartbeat";
import { HeroMetrics } from "./HeroMetrics";
import { ImpactCounters } from "./ImpactCounters";
import { ManualBillSteps } from "./ManualBillSteps";
import { PriceCard } from "./PriceCard";
import { Sidebar } from "./Sidebar";
import { Simulator } from "./Simulator";
import { SkeletonChart } from "./SkeletonChart";

type DashboardProps = {
  initialUserId: string;
  initialSnapshot: EnergySnapshot | null;
  initialError: string | null;
};

export function Dashboard({
  initialUserId,
  initialSnapshot,
  initialError,
}: DashboardProps) {
  const [userId, setUserId] = useState(initialUserId);
  const [snap, setSnap] = useState<EnergySnapshot | null>(initialSnapshot);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(initialError);
  const userIdRef = useRef(userId);
  const skipUserIdLoadOnce = useRef(true);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await loadEnergySnapshot(userIdRef.current);
      if (!res.ok) {
        setErr(res.error);
        setSnap(null);
      } else {
        setSnap(res.snapshot);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Unknown error");
      setSnap(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  useEffect(() => {
    const t = setInterval(() => void load(), 60_000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    if (skipUserIdLoadOnce.current) {
      skipUserIdLoadOnce.current = false;
      return;
    }
    void load();
  }, [userId, load]);

  const price = snap?.latest?.price_cents ?? null;
  const logs = snap?.logs ?? [];
  const prices = logs.map((l) => l.price_cents).filter(Number.isFinite);
  const mean24 =
    prices.length > 0
      ? prices.reduce((a, b) => a + b, 0) / prices.length
      : null;

  return (
    <div className="flex min-h-screen flex-col sm:flex-row">
      <Sidebar />
      <main className="flex flex-1 flex-col overflow-auto" id="main">
        <div className="border-b border-[var(--border-soft)] bg-[var(--surface)]/80 px-4 py-4 backdrop-blur-sm sm:px-10">
          <div className="mx-auto flex max-w-3xl flex-col gap-4 lg:max-w-4xl">
            <label className="flex flex-col gap-2 text-base font-medium text-[var(--text-secondary)] sm:flex-row sm:items-center sm:gap-4">
              <span className="min-w-[7rem]">Your account ID</span>
              <input
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="input-calm flex-1 max-w-md"
                aria-describedby="user-help"
                autoComplete="username"
              />
            </label>
            <p id="user-help" className="sr-only">
              MongoDB user_id for energy_logs and user_stats
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => void load()}
                disabled={loading}
                className="btn-calm inline-flex min-h-[48px] items-center gap-2 disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-5 w-5 shrink-0 ${loading ? "animate-spin" : ""}`}
                  aria-hidden
                />
                Refresh data
              </button>
              {loading ? (
                <span className="text-base text-[var(--text-muted)]">
                  Updating…
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-10 lg:max-w-4xl">
          <div id="overview" className="scroll-mt-24">
            <DashboardHeader
              active={snap?.status.active ?? false}
              lastPollMinutesAgo={snap?.status.lastPollMinutesAgo ?? null}
              lastPolledLabel={snap?.status.lastPolledLabel ?? "No polls yet"}
            />

            {err ? (
              <div
                className="mb-8 rounded-[var(--radius-card)] border border-[var(--warm-alert)]/30 bg-[var(--warm-alert-bg)] px-5 py-4 text-base text-[var(--text)]"
                role="alert"
              >
                {err}
              </div>
            ) : null}

            <HeroMetrics
              snapshot={snap}
              priceCents={price}
              avg24h={mean24}
              loading={loading}
            />

            <div className="mt-8">
              <GoldenWindowBanner windows={snap?.goldenWindows ?? []} />
            </div>
          </div>

          <div className="mt-12 space-y-6">
            <ExpandableSection
              id="impact-more"
              title="Your impact and air quality"
              description="Carbon savings and a fuller picture of savings — open when you want the details."
            >
              {snap ? (
                <ImpactCounters
                  dollars={snap.stats.total_dollars_saved}
                  carbonKg={snap.stats.total_carbon_saved_kg}
                />
              ) : (
                <p className="text-base text-[var(--text-muted)]">
                  Connect your data to see impact totals.
                </p>
              )}
            </ExpandableSection>

            <ExpandableSection
              id="price-detail"
              title="Price in context"
              description="How the current price compares with the last day of readings."
            >
              {loading ? (
                <div className="h-24 animate-pulse rounded-2xl bg-[var(--surface-muted)]" />
              ) : (
                <PriceCard
                  priceCents={price}
                  avg24h={mean24}
                  pulseAmber={snap?.pricePulseAmber ?? false}
                  zScore={snap?.priceZScore ?? null}
                />
              )}
            </ExpandableSection>
          </div>

          <section
            id="dial"
            className="scroll-mt-24 mt-14 rounded-[var(--radius-card)] border border-[var(--border-soft)] bg-[var(--surface)] p-6 shadow-[var(--shadow-card)] sm:p-8"
          >
            {!snap ? (
              loading ? (
                <SkeletonChart />
              ) : (
                <p className="text-base text-[var(--text-muted)]">
                  No efficiency data yet. Check the message above or your
                  account ID.
                </p>
              )
            ) : (
              <EfficiencyDial snapshot={snap} />
            )}
          </section>

          <section
            id="grid"
            className="scroll-mt-24 mt-10 rounded-[var(--radius-card)] border border-[var(--border-soft)] bg-[var(--surface)] p-6 shadow-[var(--shadow-card)] sm:p-8"
          >
            <GridHeartbeat snapshot={snap} loading={loading} />
          </section>

          <section
            id="insights"
            className="scroll-mt-24 mt-10 min-h-[240px] rounded-[var(--radius-card)] border border-[var(--border-soft)] bg-[var(--surface)] p-6 shadow-[var(--shadow-card)] sm:p-8"
          >
            <AgentInsights
              text={snap?.insight ?? ""}
              ecoZScore={snap?.ecoZScore ?? null}
              fromLlm={snap?.insightFromLlm ?? false}
            />
          </section>

          <section id="plan" className="scroll-mt-24 mt-10">
            <Simulator />
          </section>

          <section
            id="records"
            className="scroll-mt-24 mt-10 space-y-10 pb-16"
          >
            <BillUploadPanel />
            <ManualBillSteps />
          </section>
        </div>
      </main>
    </div>
  );
}
