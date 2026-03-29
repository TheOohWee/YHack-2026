"use server";

import "@/lib/load-env";

import { getEnergySnapshot } from "@/lib/energy-service";
import type { EnergySnapshot } from "@/types/energy";

export type LoadEnergyResult =
  | { ok: true; snapshot: EnergySnapshot }
  | { ok: false; error: string };

/** Optional: base URL of wattsup-serve (no trailing slash). Refresh triggers POST /poll before re-reading Mongo. */
async function triggerLivePollIfConfigured(userId: string): Promise<void> {
  const base = process.env.WATTSUP_SERVE_URL?.trim().replace(/\/$/, "");
  if (!base) return;

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 120_000);
  try {
    const res = await fetch(`${base}/poll`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, dry_run: false }),
      signal: ac.signal,
    });
    if (!res.ok) {
      const detail = await res.text();
      throw new Error(
        `Live poll failed (${res.status}). Is wattsup-serve running at ${base}? ${detail.slice(0, 280)}`,
      );
    }
  } finally {
    clearTimeout(timer);
  }
}

export async function loadEnergySnapshot(userId: string): Promise<LoadEnergyResult> {
  const id = (userId || "test-user").trim();
  if (!process.env.MONGODB_URI) {
    return {
      ok: false,
      error:
        "MONGODB_URI is not set. Add it to wattsup/.env or web/.env.local, then restart Next.js.",
    };
  }
  try {
    await triggerLivePollIfConfigured(id);
    const snapshot = await getEnergySnapshot(id);
    return { ok: true, snapshot };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to load energy snapshot",
    };
  }
}
