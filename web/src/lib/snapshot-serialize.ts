import type { EnergySnapshot } from "@/types/energy";

/** Strip Mongo/BSON values so RSC + Server Actions can serialize the snapshot. */
export function flightSafeSnapshot(snapshot: EnergySnapshot): EnergySnapshot {
  return JSON.parse(JSON.stringify(snapshot)) as EnergySnapshot;
}
