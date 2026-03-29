"use client";

import { DEMO_GREEN_STREAK_FALLBACK } from "@/lib/demo-streak";
import type { GreenStreakState } from "@/types/energy";
import { CalendarDays, Flame, Leaf } from "lucide-react";
import { InfoModal } from "./InfoModal";

type StreakPlantHeroProps = {
  streak: GreenStreakState | null;
  loading: boolean;
};

const STREAK_TREE_FILES = [
  "Streak Level=Seedling.svg",
  "Streak Level=Sapling.svg",
  "Streak Level=Mature.svg",
  "Streak Level=Flourishing.svg",
] as const;

const STAGE_LABELS = ["Seedling", "Sapling", "Mature", "Flourishing"] as const;

function publicSvgUrl(filename: string): string {
  return `/${encodeURIComponent(filename)}`;
}

/** 1–4 from green-poll streak and calendar-day span (same scale as stats cards). */
function streakTreeStage(pollStreak: number, calendarDays: number): 1 | 2 | 3 | 4 {
  const score = Math.max(pollStreak, calendarDays);
  if (score <= 0) return 1;
  if (score <= 2) return 2;
  if (score <= 6) return 3;
  return 4;
}

function StreakTreeHeroImage({
  pollStreak,
  calendarDays,
}: {
  pollStreak: number;
  calendarDays: number;
}) {
  const stage = streakTreeStage(pollStreak, calendarDays);
  const idx = stage - 1;
  const src = publicSvgUrl(STREAK_TREE_FILES[idx]);
  const label = STAGE_LABELS[idx];

  return (
    <img
      src={src}
      alt={`Energy streak tree — ${label} stage (${stage} of 4)`}
      width={208}
      height={208}
      className="mx-auto h-44 w-auto max-h-52 max-w-[min(100%,16rem)] object-contain sm:h-52"
      decoding="async"
    />
  );
}

export function StreakPlantHero({ streak, loading }: StreakPlantHeroProps) {
  const data = streak ?? DEMO_GREEN_STREAK_FALLBACK;
  const current = data.currentStreak;
  const longest = data.longestStreak;
  const leafDays = Math.max(0, data.streakCalendarDays);
  const lastGreen = data.lastPollWasGreen;

  return (
    <section
      className="relative mb-8 overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-soft)] bg-gradient-to-br from-[var(--accent-wash)]/60 via-[var(--surface)] to-[var(--surface)] p-5 pb-7 shadow-[var(--shadow-card)] sm:p-8 sm:pb-10"
      aria-labelledby="green-streak-heading"
    >
      <div className="absolute top-4 right-4 z-10">
        <InfoModal title="Green streak">
          <p>
            After each poll we compare your eco-efficiency score to the median of
            all your earlier scores. When the new score is higher, that poll counts
            as a &ldquo;green&rdquo; check-in and your streak grows.
          </p>
          <p className="mt-3">
            The tree icon advances through four stages — seedling, sapling,
            mature, and flourishing — as your green polls and streak days add up.
          </p>
          <p className="mt-3">
            Streaks reset when a poll is at or below your rolling median — keep
            the grid on your side when you can.
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
          <StreakTreeHeroImage pollStreak={current} calendarDays={leafDays} />
        )}

        <h2
          id="green-streak-heading"
          className="mt-6 text-xl font-semibold text-[var(--text)] sm:text-2xl"
        >
          Your green streak
        </h2>
        <p className="mt-2 max-w-md text-base text-[var(--text-muted)]">
          Grow your plant with consecutive polls where your score beats your
          personal median — small wins that add up.
        </p>

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
                    Green polls
                  </p>
                  <p className="text-2xl font-semibold tabular-nums text-[var(--text)]">
                    {current}
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
                    Green days
                  </p>
                  <p className="text-2xl font-semibold tabular-nums text-[var(--text)]">
                    {leafDays}
                  </p>
                </div>
              </div>
            </div>
            {lastGreen != null ? (
              <p className="max-w-md text-sm text-[var(--text-secondary)]">
                Last poll:{" "}
                <span className="font-medium text-[var(--text)]">
                  {lastGreen
                    ? "Above your median — nice."
                    : "At or below your median."}
                </span>
                {data.rollingMedianAtPoll != null &&
                data.lastEcoScore != null ? (
                  <span className="text-[var(--text-muted)]">
                    {" "}
                    (score {data.lastEcoScore.toFixed(1)} vs median{" "}
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
