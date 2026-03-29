"use client";

import { Radio, RefreshCw } from "lucide-react";
import { ProfileAvatarMenu } from "./ProfileAvatarMenu";

export function DashboardHeader({
  active,
  lastPollMinutesAgo,
  lastPolledLabel,
  onRefresh,
  refreshLoading,
}: {
  active: boolean;
  lastPollMinutesAgo: number | null;
  lastPolledLabel: string;
  onRefresh: () => void;
  refreshLoading: boolean;
}) {
  const stale =
    !active && lastPollMinutesAgo !== null && lastPollMinutesAgo >= 20;

  return (
    <header className="mb-10 border-b border-[var(--border-soft)] pb-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--text)] sm:text-4xl">
            Your energy snapshot
          </h1>
          <p className="mt-3 max-w-2xl text-lg text-[var(--text-muted)]">
            A quiet read on price, clean power, and what it means for your home —
            without the jargon.
          </p>
        </div>
        <ProfileAvatarMenu />
      </div>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div
          className="inline-flex max-w-full flex-wrap items-center gap-3 rounded-full border border-[var(--border-soft)] bg-[var(--surface)] px-4 py-3 text-base text-[var(--text-secondary)] shadow-[var(--shadow-card)]"
          role="status"
          aria-live="polite"
        >
          <Radio
            className={`h-5 w-5 shrink-0 ${
              active ? "text-[var(--accent)]" : "text-[var(--text-muted)]"
            }`}
            aria-hidden
          />
          <span>
            {active ? "Readings are updating" : "Waiting for the next reading"}
          </span>
          <span className="text-[var(--text-muted)]">·</span>
          <span>Last update: {lastPolledLabel}</span>
          {stale ? (
            <span className="rounded-full bg-[var(--sun)]/50 px-3 py-1 text-sm text-[var(--text)]">
              Data is a little older — check back soon
            </span>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshLoading}
          className="btn-calm inline-flex min-h-[48px] shrink-0 items-center justify-center gap-2 self-start disabled:opacity-50 sm:self-center"
        >
          <RefreshCw
            className={`h-5 w-5 shrink-0 ${refreshLoading ? "animate-spin" : ""}`}
            aria-hidden
          />
          Refresh data
        </button>
      </div>
    </header>
  );
}
