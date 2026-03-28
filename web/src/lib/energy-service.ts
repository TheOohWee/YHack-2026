import { getDb } from "@/lib/mongodb";
import {
  findGoldenWindows,
  normalizeDialPercent,
  priceZScoreFromLogs,
} from "@/lib/quant-compute";
import type { EnergyLogPoint, EnergySnapshot } from "@/types/energy";

function docToPoint(doc: Record<string, unknown>): EnergyLogPoint | null {
  const ts = doc.timestamp;
  if (!ts) return null;
  const pd = doc.price_data as Record<string, unknown> | undefined;
  const fm = doc.fuel_mix as Record<string, unknown> | undefined;
  const price = Number(pd?.current_price ?? 0);
  return {
    timestamp: new Date(ts as string).toISOString(),
    wind_pct: Number(fm?.wind_pct ?? 0),
    solar_pct: Number(fm?.solar_pct ?? 0),
    fossil_pct: Number(fm?.fossil_pct ?? 0),
    price_cents: price,
    renewable_pct:
      typeof doc.renewable_pct === "number"
        ? doc.renewable_pct
        : undefined,
    eco_efficiency_score:
      typeof doc.eco_efficiency_score === "number"
        ? doc.eco_efficiency_score
        : undefined,
    z_score: typeof doc.z_score === "number" ? doc.z_score : undefined,
    gridstatus_ok:
      typeof doc.gridstatus_ok === "boolean" ? doc.gridstatus_ok : undefined,
  };
}

const ENCOURAGING_FALLBACK =
  "Your grid favors clean electrons more often than you think. " +
  "When wind and sun are strong and prices dip, shifting a load of laundry or charging " +
  "can trim both your bill and your footprint. Small moves add up for people and the planet.";

export async function getEnergySnapshot(userId: string): Promise<EnergySnapshot> {
  const db = await getDb();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [rows, statsDoc, lastForStatus] = await Promise.all([
    db
      .collection("energy_logs")
      .find({ user_id: userId, timestamp: { $gte: since } })
      .sort({ timestamp: 1 })
      .limit(2000)
      .toArray(),
    db.collection("user_stats").findOne({ user_id: userId }),
    db
      .collection("energy_logs")
      .findOne({ user_id: userId }, { sort: { timestamp: -1 } }),
  ]);

  const logs: EnergyLogPoint[] = [];
  for (const r of rows) {
    const p = docToPoint(r as Record<string, unknown>);
    if (p) logs.push(p);
  }

  const latestDoc = lastForStatus as Record<string, unknown> | null;
  const latest = latestDoc ? docToPoint(latestDoc) : null;

  const lastTs = latestDoc?.timestamp
    ? new Date(latestDoc.timestamp as string).getTime()
    : null;
  const lastPollMinutesAgo =
    lastTs != null ? (Date.now() - lastTs) / 60000 : null;
  const active = lastPollMinutesAgo !== null && lastPollMinutesAgo < 20;

  const currentScore = latest?.eco_efficiency_score ?? 0;
  const dialPercent = normalizeDialPercent(logs, currentScore);

  const latestPrice = latest?.price_cents ?? 0;
  const pz = priceZScoreFromLogs(logs, latestPrice);
  const pricePulseAmber = pz !== null && pz > 2;

  const goldenWindows = findGoldenWindows(logs);

  const llm = latestDoc && typeof latestDoc.llm_analysis === "string"
    ? latestDoc.llm_analysis
    : "";
  const insight = llm.trim().length > 0 ? llm : ENCOURAGING_FALLBACK;

  const stats = {
    total_carbon_saved_kg: Number(
      statsDoc?.total_carbon_saved ?? statsDoc?.total_carbon_saved_kg ?? 0,
    ),
    total_dollars_saved: Number(statsDoc?.total_dollars_saved ?? 0),
  };

  return {
    userId,
    stats,
    logs,
    latest,
    latestRaw: latestDoc,
    dialPercent,
    priceZScore: pz,
    pricePulseAmber,
    goldenWindows,
    insight,
    status: {
      active,
      lastPollMinutesAgo:
        lastPollMinutesAgo !== null ? Math.round(lastPollMinutesAgo) : null,
    },
  };
}
