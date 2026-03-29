import type { GreenStreakState } from "@/types/energy";

/** Shown when Mongo has no `streaks` doc yet so the plant hero still looks alive. */
export const DEMO_GREEN_STREAK_FALLBACK: GreenStreakState = {
  currentStreak: 6,
  longestStreak: 14,
  lastPollWasGreen: true,
  rollingMedianAtPoll: 51.2,
  lastEcoScore: 59.4,
  streakCalendarDays: 5,
  isMock: true,
};
