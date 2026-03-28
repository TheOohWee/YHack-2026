"use client";

import { Radio } from "lucide-react";

export function DashboardHeader({
  active,
  lastPollMinutesAgo,
  lastPolledLabel,
}: {
  active: boolean;
  lastPollMinutesAgo: number | null;
  lastPolledLabel: string;
}) {
  const stale =
    !active && lastPollMinutesAgo !== null && lastPollMinutesAgo >= 20;

  return (
    <header className="mb-10 border-b border-[var(--border-soft)] pb-8">
      <h1 className="text-3xl font-semibold tracking-tight text-[var(--text)] sm:text-4xl">
        Your energy snapshot
      </h1>
      <p className="mt-3 max-w-2xl text-lg text-[var(--text-muted)]">
        A quiet read on price, clean power, and what it means for your home —
        without the jargon.
      </p>
      <div
        className="mt-6 inline-flex flex-wrap items-center gap-3 rounded-full border border-[var(--border-soft)] bg-[var(--surface)] px-4 py-3 text-base text-[var(--text-secondary)] shadow-[var(--shadow-card)]"
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
    </header>
  );
}
