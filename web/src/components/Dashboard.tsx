"use client";

import { loadEnergySnapshot } from "@/app/actions";
import { DASHBOARD_USER_ID } from "@/lib/dashboard-user";
import type { EnergySnapshot } from "@/types/energy";
import { useCallback, useEffect, useRef, useState } from "react";
import { AgentInsights } from "./AgentInsights";
import { AskWattsUp } from "./AskWattsUp";
import { BillUploadPanel } from "./BillUploadPanel";
import { DashboardHeader } from "./DashboardHeader";
import { EfficiencyDial } from "./EfficiencyDial";
import { ExpandableSection } from "./ExpandableSection";
import { GoldenWindowBanner } from "./GoldenWindowBanner";
import { GridHeartbeat } from "./GridHeartbeat";
import { HeroMetrics } from "./HeroMetrics";
import { ImpactCounters } from "./ImpactCounters";
import { InfoModal } from "./InfoModal";
import { PriceCard } from "./PriceCard";
import { SkeletonChart } from "./SkeletonChart";
import { StreakPlantHero } from "./StreakPlantHero";

type DashboardProps = {
  initialSnapshot: EnergySnapshot | null;
  initialError: string | null;
};

export function Dashboard({
  initialSnapshot,
  initialError,
}: DashboardProps) {
  const [snap, setSnap] = useState<EnergySnapshot | null>(initialSnapshot);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(initialError);
  const userIdRef = useRef(DASHBOARD_USER_ID);
  const loadEpochRef = useRef(0);
  const lastLoadedUserIdRef = useRef(DASHBOARD_USER_ID);

  const load = useCallback(async () => {
    const epoch = ++loadEpochRef.current;
    const uidAtStart = userIdRef.current;
    setLoading(true);
    setErr(null);
    if (uidAtStart !== lastLoadedUserIdRef.current) {
      setSnap(null);
    }
    try {
      const res = await loadEnergySnapshot(uidAtStart);
      if (epoch !== loadEpochRef.current || userIdRef.current !== uidAtStart) {
        return;
      }
      if (!res.ok) {
        setErr(res.error);
      } else {
        setErr(null);
        lastLoadedUserIdRef.current = uidAtStart;
        setSnap(res.snapshot);
      }
    } catch (e) {
      if (epoch !== loadEpochRef.current || userIdRef.current !== uidAtStart) {
        return;
      }
      setErr(e instanceof Error ? e.message : "Unknown error");
    } finally {
      if (epoch === loadEpochRef.current && userIdRef.current === uidAtStart) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const t = setInterval(() => void load(), 30 * 60 * 1000);
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
    <div className="min-h-screen">
      <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-10" id="main">
        <div id="overview" className="scroll-mt-24">
          <DashboardHeader
            active={snap?.status.active ?? false}
            lastPollMinutesAgo={snap?.status.lastPollMinutesAgo ?? null}
            lastPolledLabel={snap?.status.lastPolledLabel ?? "No polls yet"}
            onRefresh={() => void load()}
            refreshLoading={loading}
          />

          {err ? (
            <div
              className="mb-8 rounded-[var(--radius-card)] border border-[var(--warm-alert)]/30 bg-[var(--warm-alert-bg)] px-5 py-4 text-base text-[var(--text)]"
              role="alert"
            >
              {err}
            </div>
          ) : null}

          <StreakPlantHero
            userId={DASHBOARD_USER_ID}
            streak={snap?.streak ?? null}
            loading={loading && snap == null}
          />

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
            {loading && !snap ? (
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
          className="relative scroll-mt-24 mt-14 rounded-[var(--radius-card)] border border-[var(--border-soft)] bg-[var(--surface)] p-6 shadow-[var(--shadow-card)] sm:p-8"
        >
          <div className="absolute top-5 right-5 z-10">
            <InfoModal title="Efficiency dial">
              <p>
                The % is latest eco score ÷ your ~24h average of other polls
                (from Mongo), shown as a percent and capped at 100%. Sparse
                history uses renewables share + ComEd price.
              </p>
              <p className="mt-3">
                σ is how far this reading is from your usual efficiency,
                using recent poll history.
              </p>
            </InfoModal>
          </div>
          {!snap ? (
            loading ? (
              <SkeletonChart />
            ) : (
              <p className="text-base text-[var(--text-muted)]">
                No efficiency data yet. Run a poll or seed demo history.
              </p>
            )
          ) : (
            <EfficiencyDial snapshot={snap} />
          )}
        </section>

        <section
          id="grid"
          className="relative scroll-mt-24 mt-10 rounded-[var(--radius-card)] border border-[var(--border-soft)] bg-[var(--surface)] p-6 shadow-[var(--shadow-card)] sm:p-8"
        >
          <div className="absolute top-5 right-5 z-10">
            <InfoModal title="Grid heartbeat">
              <p>The top chart tracks wind and solar as a percentage of total generation throughout the day — higher means greener power.</p>
              <p className="mt-3">The stacked area chart below breaks down the full fuel mix: coal, gas, nuclear, imports, battery, wind, and solar. Tap the chart to see exact percentages at any point in time.</p>
            </InfoModal>
          </div>
          <GridHeartbeat snapshot={snap} loading={loading} />
        </section>

        <section
          id="insights"
          className="relative scroll-mt-24 mt-10 min-h-[240px] rounded-[var(--radius-card)] border border-[var(--border-soft)] bg-[var(--surface)] p-6 shadow-[var(--shadow-card)] sm:p-8"
        >
          <div className="absolute top-5 right-5 z-10">
            <InfoModal title="Weekly guidance">
              <p>Personalized tips generated from your usage patterns and current grid conditions. When marked &ldquo;Personalized note,&rdquo; the insight comes from an AI analysis of your specific data.</p>
              <p className="mt-3">&ldquo;General tips&rdquo; are shown when there isn&apos;t enough data for a personalized recommendation yet.</p>
            </InfoModal>
          </div>
          <AgentInsights
            text={snap?.insight ?? ""}
            ecoZScore={snap?.ecoZScore ?? null}
            fromLlm={snap?.insightFromLlm ?? false}
          />
        </section>

        <section
          id="records"
          className="scroll-mt-24 mt-10 space-y-10 pb-16"
        >
          <BillUploadPanel userId={DASHBOARD_USER_ID} />
        </section>
      </main>

      <AskWattsUp userId={DASHBOARD_USER_ID} />
    </div>
  );
}
