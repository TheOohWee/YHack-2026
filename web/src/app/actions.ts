"use server";

import { getEnergySnapshot } from "@/lib/energy-service";
import type { EnergySnapshot } from "@/types/energy";

export type LoadEnergyResult =
  | { ok: true; snapshot: EnergySnapshot }
  | { ok: false; error: string };

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
    const snapshot = await getEnergySnapshot(id);
    return { ok: true, snapshot };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to load energy snapshot",
    };
  }
}
