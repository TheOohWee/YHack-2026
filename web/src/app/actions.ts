"use server";

import "@/lib/load-env";

import { getEnergySnapshot } from "@/lib/energy-service";
import { flightSafeSnapshot } from "@/lib/snapshot-serialize";
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
      console.warn(
        `[WattsUp] Live poll failed (${res.status}) at ${base} — loading Mongo only. ${detail.slice(0, 120)}`,
      );
    }
  } catch (e) {
    console.warn(
      "[WattsUp] Live poll skipped (is wattsup-serve running?):",
      e instanceof Error ? e.message : e,
    );
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
    try {
      return { ok: true, snapshot: flightSafeSnapshot(snapshot) };
    } catch (ser) {
      console.error("loadEnergySnapshot serialize", ser);
      return {
        ok: false,
        error: "Could not package grid data for the browser. Try again.",
      };
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to load energy snapshot";
    console.error("loadEnergySnapshot", e);
    return {
      ok: false,
      error: msg,
    };
  }
}
