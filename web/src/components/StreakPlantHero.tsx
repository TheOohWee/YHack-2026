"use client";

import { DEMO_GREEN_STREAK_FALLBACK } from "@/lib/demo-streak";
import type { GreenStreakState } from "@/types/energy";
import { motion } from "framer-motion";
import { CalendarDays, Flame, Leaf } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { InfoModal } from "./InfoModal";

type StreakPlantHeroProps = {
  streak: GreenStreakState | null;
  loading: boolean;
  userId: string;
};

const STREAK_TREE_FILES = [
  "Streak Level=Seedling.svg",
  "Streak Level=Sapling.svg",
  "Streak Level=Mature.svg",
  "Streak Level=Flourishing.svg",
] as const;

const STAGE_LABELS = ["Seedling", "Sapling", "Mature", "Flourishing"] as const;

const STORAGE_PREFIX = "wattsup-streak-seen:";

function publicSvgUrl(filename: string): string {
  return `/${encodeURIComponent(filename)}`;
}

/**
 * Eco-tree evolution: ~day 1 seed, ~day 3 sprout, day 7+ blooming (four SVG stages).
 */
function streakTreeStageFromDays(dayStreak: number): 1 | 2 | 3 | 4 {
  const d = Math.max(0, Math.floor(dayStreak));
  if (d <= 1) return 1;
  if (d <= 3) return 2;
  if (d < 7) return 3;
  return 4;
}

function StreakTreeHeroImage({
  pollStreak,
  calendarDays,
}: {
  pollStreak: number;
  calendarDays: number;
}) {
  const dayScore = Math.max(pollStreak, calendarDays);
  const stage = streakTreeStageFromDays(dayScore);
  const idx = stage - 1;
  const src = publicSvgUrl(STREAK_TREE_FILES[idx]);
  const label = STAGE_LABELS[idx];

  return (
    <img
      src={src}
      alt={`Eco-tree — ${label} (${stage} of 4)`}
      width={208}
      height={208}
      className="mx-auto h-44 w-auto max-h-52 max-w-[min(100%,16rem)] object-contain sm:h-52"
      decoding="async"
    />
  );
}

function useStreakCelebration(
  userId: string,
  currentStreak: number,
  isMock: boolean,
  loading: boolean,
  streakLoaded: boolean
) {
  const [celebrate, setCelebrate] = useState(false);
  const [tickFrom, setTickFrom] = useState<number | null>(null);

  useEffect(() => {
    if (!streakLoaded || loading || isMock) {
      return undefined;
    }
    if (typeof window === "undefined") return undefined;
    const key = STORAGE_PREFIX + userId;
    const raw = sessionStorage.getItem(key);
    const prev = raw != null && raw !== "" ? Number.parseInt(raw, 10) : NaN;

    if (Number.isFinite(prev) && currentStreak > prev) {
      setTickFrom(prev);
      setCelebrate(true);
      sessionStorage.setItem(key, String(currentStreak));
      const t = window.setTimeout(() => {
        setCelebrate(false);
        setTickFrom(null);
      }, 3200);
      return () => window.clearTimeout(t);
    }

    sessionStorage.setItem(key, String(currentStreak));
    return undefined;
  }, [userId, currentStreak, isMock, loading, streakLoaded]);

  return { celebrate, tickFrom };
}

function AnimatedStreakNumber({
  value,
  tickFrom,
}: {
  value: number;
  tickFrom: number | null;
}) {
  const [display, setDisplay] = useState(tickFrom ?? value);

  useEffect(() => {
    if (tickFrom == null || tickFrom >= value) {
      setDisplay(value);
      return undefined;
    }
    setDisplay(tickFrom);
    const t0 = performance.now();
    const dur = 850;
    let raf = 0;
    const ease = (p: number) => 1 - (1 - p) ** 3;
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / dur);
      setDisplay(Math.round(tickFrom + (value - tickFrom) * ease(p)));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, tickFrom]);

  return (
    <motion.span className="tabular-nums" layout="position">
      {display}
    </motion.span>
  );
}

export function StreakPlantHero({
  streak,
  loading,
  userId,
}: StreakPlantHeroProps) {
  const data = streak ?? DEMO_GREEN_STREAK_FALLBACK;
  const current = data.currentStreak;
  const longest = data.longestStreak;
  const leafDays = Math.max(0, data.streakCalendarDays);
  const lastGreen = data.lastPollWasGreen;
  const isMock = data.isMock === true;
  const streakLoaded = !loading || streak != null;

  const dayScore = Math.max(current, leafDays);
  const treeStage = streakTreeStageFromDays(dayScore);
  const stageLabel = STAGE_LABELS[treeStage - 1];

  const { celebrate, tickFrom } = useStreakCelebration(
    userId,
    current,
    isMock,
    loading,
    streakLoaded
  );

  const confettiPieces = useMemo(
    () =>
      Array.from({ length: 10 }, (_, i) => ({
        id: i,
        x: (Math.sin(i * 1.7) * 40 + (i % 3) * 12) as number,
        delay: i * 0.04,
        scale: 0.45 + (i % 3) * 0.2,
      })),
    []
  );

  return (
    <section
      className="relative mb-8 overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-soft)] bg-gradient-to-br from-[var(--accent-wash)]/60 via-[var(--surface)] to-[var(--surface)] p-5 pb-7 shadow-[var(--shadow-card)] sm:p-8 sm:pb-10"
      aria-labelledby="green-streak-heading"
    >
      <div className="absolute top-4 right-4 z-10">
        <InfoModal title="Clean Energy streak">
          <p>
            Your day streak grows when WattsUp confirms good choices: you accept
            a coach suggestion in Slack/Telegram (active win), or background
            polls show restrained usage during a dirty-grid window — when
            ComEd&apos;s 5-minute price is unusually low vs your recent history
            (price z-score below about -2), we look for eco scores at or under
            your rolling median during those polls.
          </p>
          <p className="mt-3">
            On quiet grid days, beating your personal median eco-efficiency score
            still earns the day. Streaks need consecutive qualifying UTC days.
          </p>
          <p className="mt-3">
            The Eco-tree evolves: ~day 1 seedling, ~day 3 sapling, and a
            flourishing tree from about day 7 onward.
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
          <motion.div
            className="relative mx-auto"
            animate={
              celebrate
                ? {
                    filter: [
                      "drop-shadow(0 0 0px rgba(34,197,94,0))",
                      "drop-shadow(0 0 28px rgba(34,197,94,0.55))",
                      "drop-shadow(0 0 12px rgba(34,197,94,0.35))",
                    ],
                  }
                : { filter: "drop-shadow(0 0 0px rgba(34,197,94,0))" }
            }
            transition={{ duration: 1.4, times: [0, 0.45, 1] }}
          >
            {celebrate ? (
              <div
                className="pointer-events-none absolute inset-0 z-10 flex items-start justify-center"
                aria-hidden
              >
                {confettiPieces.map((p) => (
                  <motion.span
                    key={p.id}
                    className="absolute top-1/2 h-2 w-2 rounded-full bg-emerald-400/90"
                    initial={{ opacity: 0, x: 0, y: 0, scale: p.scale }}
                    animate={{
                      opacity: [0, 1, 0.9, 0],
                      x: p.x,
                      y: [-8, -52 - p.id * 4, -72],
                      rotate: [0, p.x > 0 ? 40 : -40],
                    }}
                    transition={{
                      duration: 1.5,
                      delay: p.delay,
                      ease: "easeOut",
                    }}
                  />
                ))}
              </div>
            ) : null}
            <motion.div
              animate={
                celebrate ? { scale: [1, 1.04, 1] } : { scale: 1 }
              }
              transition={{ duration: 0.75 }}
            >
              <StreakTreeHeroImage
                pollStreak={current}
                calendarDays={leafDays}
              />
            </motion.div>
          </motion.div>
        )}

        <h2
          id="green-streak-heading"
          className="mt-6 text-xl font-semibold text-[var(--text)] sm:text-2xl"
        >
          Your Clean Energy streak
        </h2>
        <p className="mt-2 max-w-md text-base text-[var(--text-muted)]">
          Active wins (you said yes to shifting load) and passive clean days
          during grid spikes — your Eco-tree levels up with you.
        </p>

        {celebrate ? (
          <p
            className="mt-3 max-w-md rounded-xl bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-800 dark:text-emerald-200"
            role="status"
          >
            Streak up — nice work keeping usage smart when it mattered.
          </p>
        ) : null}

        {loading && streak == null ? (
          <div className="mt-6 flex w-full max-w-md flex-wrap justify-center gap-3">
            <div className="h-14 flex-1 min-w-[9rem] max-w-[11rem] animate-pulse rounded-xl bg-[var(--surface-muted)]" />
            <div className="h-14 flex-1 min-w-[9rem] max-w-[11rem] animate-pulse rounded-xl bg-[var(--surface-muted)]" />
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
                  <p className="text-2xl font-semibold tabular-nums text-[var(--text)]">
                    <AnimatedStreakNumber value={current} tickFrom={tickFrom} />
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
                    Eco-tree stage
                  </p>
                  <p className="text-lg font-semibold text-[var(--text)]">
                    {stageLabel}
                  </p>
                </div>
              </div>
            </div>
            {lastGreen != null ? (
              <p className="max-w-md text-sm text-[var(--text-secondary)]">
                Today&apos;s grid day:{" "}
                <span className="font-medium text-[var(--text)]">
                  {lastGreen
                    ? "Qualified — streak can grow."
                    : "Needs a clean win to count."}
                </span>
                {data.rollingMedianAtPoll != null &&
                data.lastEcoScore != null ? (
                  <span className="text-[var(--text-muted)]">
                    {" "}
                    (last eco score {data.lastEcoScore.toFixed(1)} vs median{" "}
                    {data.rollingMedianAtPoll.toFixed(1)})
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
