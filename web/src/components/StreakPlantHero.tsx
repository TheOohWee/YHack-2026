"use client";

import { displayScoreInt } from "@/lib/display-score";
import { DEMO_GREEN_STREAK_FALLBACK } from "@/lib/demo-streak";
import type { GreenStreakState } from "@/types/energy";
import confetti from "canvas-confetti";
import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import { CalendarDays, Flame, Leaf } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { InfoModal } from "./InfoModal";

type StreakPlantHeroProps = {
  userId: string;
  streak: GreenStreakState | null;
  loading: boolean;
};

const STREAK_TREE_FILES = [
  "Streak Level=Seedling.svg",
  "Streak Level=Sapling.svg",
  "Streak Level=Mature.svg",
  "Streak Level=Flourishing.svg",
] as const;

/** Day 1 seed → day 3 sprout → day 7 bloom (maps to 4 art stages). */
const STAGE_LABELS = ["Seed", "Sprout", "Bloom", "Flourishing"] as const;

function publicSvgUrl(filename: string): string {
  return `/${encodeURIComponent(filename)}`;
}

/** Visual evolution from calendar streak days (UTC) — aligns with Eco-Tree story. */
function streakTreeStage(calendarDays: number): 1 | 2 | 3 | 4 {
  const d = Math.max(0, calendarDays);
  if (d <= 1) return 1;
  if (d < 3) return 2;
  if (d < 7) return 3;
  return 4;
}

function StreakTreeHeroImage({
  calendarDays,
  glow,
}: {
  calendarDays: number;
  glow: boolean;
}) {
  const stage = streakTreeStage(calendarDays);
  const idx = stage - 1;
  const src = publicSvgUrl(STREAK_TREE_FILES[idx]);
  const label = STAGE_LABELS[idx];

  return (
    <motion.div
      className={`relative mx-auto rounded-3xl ${glow ? "ring-4 ring-emerald-400/70 shadow-[0_0_40px_rgba(52,211,153,0.35)]" : ""}`}
      animate={glow ? { scale: [1, 1.04, 1] } : {}}
      transition={{ duration: 0.9, ease: "easeOut" }}
    >
      <img
        src={src}
        alt={`Eco-tree — ${label} (${stage} of 4)`}
        width={208}
        height={208}
        className="mx-auto h-44 w-auto max-h-52 max-w-[min(100%,16rem)] object-contain sm:h-52"
        decoding="async"
      />
    </motion.div>
  );
}

function useCelebration(
  userId: string,
  currentStreak: number,
  loading: boolean,
  streakIsNull: boolean,
) {
  const [showGlow, setShowGlow] = useState(false);
  const [tickFrom, setTickFrom] = useState<number | null>(null);
  const firedRef = useRef(false);

  useEffect(() => {
    if (loading || streakIsNull || typeof window === "undefined") return;
    const key = `wattsup_last_streak_${userId}`;
    const raw = window.localStorage.getItem(key);
    if (raw === null) {
      window.localStorage.setItem(key, String(currentStreak));
      return;
    }
    const prev = Number.parseInt(raw, 10);
    if (!Number.isFinite(prev)) {
      window.localStorage.setItem(key, String(currentStreak));
      return;
    }
    if (currentStreak > prev) {
      setTickFrom(prev);
      setShowGlow(true);
      if (!firedRef.current) {
        firedRef.current = true;
        const burst = () => {
          void confetti({
            particleCount: 90,
            spread: 68,
            startVelocity: 32,
            origin: { y: 0.55, x: 0.5 },
            colors: ["#34d399", "#6ee7b7", "#a7f3d0", "#fbbf24"],
          });
        };
        burst();
        window.setTimeout(burst, 180);
      }
      window.localStorage.setItem(key, String(currentStreak));
      const t = window.setTimeout(() => {
        setShowGlow(false);
        setTickFrom(null);
        firedRef.current = false;
      }, 3200);
      return () => window.clearTimeout(t);
    }
    window.localStorage.setItem(key, String(currentStreak));
    return undefined;
  }, [userId, currentStreak, loading, streakIsNull]);

  return { showGlow, tickFrom };
}

function AnimatedStreakDigit({
  value,
  tickFrom,
  loading,
}: {
  value: number;
  tickFrom: number | null;
  loading: boolean;
}) {
  const mv = useMotionValue(value);
  const rounded = useTransform(mv, (v) => Math.round(v));

  useEffect(() => {
    if (tickFrom != null && tickFrom < value) {
      mv.set(tickFrom);
      const c = animate(mv, value, {
        duration: 1.05,
        ease: [0.22, 1, 0.36, 1],
      });
      return () => c.stop();
    }
    mv.set(value);
    return undefined;
  }, [mv, value, tickFrom]);

  if (loading && tickFrom == null) {
    return <span className="tabular-nums">{value}</span>;
  }
  return <motion.span className="tabular-nums">{rounded}</motion.span>;
}

export function StreakPlantHero({ userId, streak, loading }: StreakPlantHeroProps) {
  const data = streak ?? DEMO_GREEN_STREAK_FALLBACK;
  const current = data.currentStreak;
  const longest = data.longestStreak;
  /** Tree + counters use UTC calendar-day streak (hourly polls fold into one day). */
  const leafDays = Math.max(
    0,
    Math.max(data.streakCalendarDays, data.currentStreak),
  );
  const lastGreen = data.lastPollWasGreen;
  const lastEcoInt = displayScoreInt(data.lastEcoScore);
  const medianInt = displayScoreInt(data.rollingMedianAtPoll);
  const { showGlow, tickFrom } = useCelebration(
    userId,
    current,
    loading,
    streak == null,
  );

  return (
    <section
      className="relative mb-8 overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-soft)] bg-gradient-to-br from-[var(--accent-wash)]/60 via-[var(--surface)] to-[var(--surface)] p-5 pb-7 shadow-[var(--shadow-card)] sm:p-8 sm:pb-10"
      aria-labelledby="green-streak-heading"
    >
      {showGlow ? (
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="mb-2 text-center text-sm font-semibold text-emerald-700 dark:text-emerald-400"
        >
          Your streak grew — Eco-Tree leveled up!
        </motion.p>
      ) : null}

      <div className="absolute top-4 right-4 z-10">
        <InfoModal title="Clean energy streak">
          <p>
            Your streak grows when you make a <strong>good choice</strong> the agent can
            see — e.g. typing <strong>help me optimize</strong> (or the other save-energy
            phrases) in Slack, <strong>/wattwise-optimize</strong>, a push confirmation, or
            holding steady during a <strong>stressed grid</strong> window.
          </p>
          <p className="mt-3">
            A day only counts if <strong>most hourly polls</strong> that day were wins
            (not one lucky hour). The Eco-Tree uses your current day-streak.
          </p>
        </InfoModal>
      </div>

      <div className="mx-auto flex max-w-xl flex-col items-center px-2 pt-10 text-center sm:pt-12">
        {loading && streak == null ? (
          <div
            className="mx-auto h-44 w-44 max-w-[min(100%,13rem)] animate-pulse rounded-3xl bg-[var(--surface-muted)]/80 sm:h-52 sm:w-52 sm:max-w-[16rem]"
            aria-hidden
          />
        ) : (
          <StreakTreeHeroImage calendarDays={leafDays} glow={showGlow} />
        )}

        <h2
          id="green-streak-heading"
          className="mt-6 text-xl font-semibold text-[var(--text)] sm:text-2xl"
        >
          Your clean energy streak
        </h2>
        <p className="mt-2 max-w-md text-base text-[var(--text-muted)]">
          Active wins when you opt in; passive wins when you ride out a dirty grid without
          spiking usage. Both grow your Eco-Tree.
        </p>

        {loading && streak == null ? (
          <div className="mt-6 flex w-full max-w-md flex-wrap justify-center gap-3">
            <div className="h-14 min-w-[9rem] max-w-[11rem] flex-1 animate-pulse rounded-xl bg-[var(--surface-muted)]" />
            <div className="h-14 min-w-[9rem] max-w-[11rem] flex-1 animate-pulse rounded-xl bg-[var(--surface-muted)]" />
          </div>
        ) : (
          <div className="mt-6 flex w-full flex-col items-center gap-3">
            <div className="flex flex-wrap justify-center gap-3">
              <div className="flex min-w-[9rem] items-center gap-2 rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-4 py-3 shadow-sm">
                <Flame
                  className="h-6 w-6 shrink-0 text-orange-500"
                  strokeWidth={2}
                  aria-hidden
                />
                <div className="text-left">
                  <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                    Day streak
                  </p>
                  <p className="text-2xl font-semibold text-[var(--text)]">
                    <AnimatedStreakDigit
                      value={current}
                      tickFrom={tickFrom}
                      loading={loading}
                    />
                  </p>
                </div>
              </div>
              <div className="flex min-w-[9rem] items-center gap-2 rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-4 py-3 shadow-sm">
                <Leaf
                  className="h-6 w-6 shrink-0 text-emerald-600"
                  strokeWidth={2}
                  aria-hidden
                />
                <div className="text-left">
                  <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                    Best run
                  </p>
                  <p className="text-2xl font-semibold tabular-nums text-[var(--text)]">
                    {longest}
                  </p>
                </div>
              </div>
              <div className="flex min-w-[9rem] items-center gap-2 rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-4 py-3 shadow-sm">
                <CalendarDays
                  className="h-6 w-6 shrink-0 text-teal-600"
                  strokeWidth={2}
                  aria-hidden
                />
                <div className="text-left">
                  <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                    Eco-tree days
                  </p>
                  <p className="text-2xl font-semibold tabular-nums text-[var(--text)]">
                    {leafDays}
                  </p>
                </div>
              </div>
            </div>
            {lastGreen != null ? (
              <p className="max-w-md text-sm text-[var(--text-secondary)]">
                Last check-in:{" "}
                <span className="font-medium text-[var(--text)]">
                  {lastGreen ? "Counted toward your streak." : "Did not advance the streak."}
                </span>
                {lastEcoInt != null && medianInt != null ? (
                  <span className="text-[var(--text-muted)]">
                    {" "}
                    (score {lastEcoInt} vs median {medianInt})
                  </span>
                ) : null}
              </p>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}
