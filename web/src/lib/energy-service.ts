import { getDb } from "@/lib/mongodb";
import {
  findGoldenWindows,
  normalizeDialPercent,
  priceZScoreFromLogs,
} from "@/lib/quant-compute";
import type { EnergyLogPoint, EnergySnapshot } from "@/types/energy";

/** Mongo/driver sometimes returns non-number numerics (e.g. Decimal128). */
function toFiniteNumber(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  if (typeof v === "object" && "toString" in (v as object)) {
    const n = Number(String(v));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function formatLastPolledLabel(minutesAgo: number | null): string {
  if (minutesAgo == null) return "No polls yet";
  if (minutesAgo < 1) return "just now";
  if (minutesAgo < 60) return `${Math.round(minutesAgo)}m ago`;
  const hours = Math.floor(minutesAgo / 60);
  const minutes = Math.round(minutesAgo % 60);
  if (hours < 24) return `${hours}h ${minutes}m ago`;
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return `${days}d ${remHours}h ago`;
}

function docToPoint(doc: Record<string, unknown>): EnergyLogPoint | null {
  const ts = doc.timestamp;
  if (!ts) return null;
  const pd = doc.price_data as Record<string, unknown> | undefined;
  const fm = doc.fuel_mix as Record<string, unknown> | undefined;
  const price = Number(pd?.current_price ?? 0);

  const isGranularFuelMix =
    fm != null &&
    (toFiniteNumber(fm.wind) !== null ||
      toFiniteNumber(fm.coal) !== null ||
      toFiniteNumber(fm.natural_gas) !== null);

  let nuclear: number;
  let coal: number;
  let natural_gas: number;
  let wind: number;
  let solar: number;
  let battery_storage: number;
  let imports: number;
  let other: number;

  if (isGranularFuelMix && fm) {
    nuclear = toFiniteNumber(fm.nuclear) ?? 0;
    coal = toFiniteNumber(fm.coal) ?? 0;
    natural_gas = toFiniteNumber(fm.natural_gas) ?? 0;
    wind = toFiniteNumber(fm.wind) ?? 0;
    solar = toFiniteNumber(fm.solar) ?? 0;
    battery_storage = toFiniteNumber(fm.battery_storage) ?? 0;
    imports = toFiniteNumber(fm.imports) ?? 0;
    other = toFiniteNumber(fm.other) ?? 0;
  } else {
    const w = Number(fm?.wind_pct ?? 0);
    const s = Number(fm?.solar_pct ?? 0);
    const fossil = Number(fm?.fossil_pct ?? 0);
    const n = Number(fm?.nuclear_pct ?? 0);
    const hydro = Number(fm?.hydro_pct ?? 0);
    const o =
      typeof fm?.other_pct === "number"
        ? Number(fm.other_pct)
        : Math.max(0, Math.min(100, 100 - w - s - fossil - n - hydro));
    nuclear = n;
    coal = 0;
    natural_gas = fossil;
    wind = w;
    solar = s;
    battery_storage = 0;
    imports = 0;
    other = hydro + o;
  }

  return {
    timestamp: new Date(ts as string).toISOString(),
    nuclear,
    coal,
    natural_gas,
    wind,
    solar,
    battery_storage,
    imports,
    other,
    price_cents: price,
    renewable_pct:
      typeof doc.renewable_pct === "number"
        ? doc.renewable_pct
        : undefined,
    eco_efficiency_score:
      typeof doc.eco_efficiency_score === "number"
        ? doc.eco_efficiency_score
        : null,
    z_score: typeof doc.z_score === "number" ? doc.z_score : undefined,
    gridstatus_ok:
      typeof doc.gridstatus_ok === "boolean" ? doc.gridstatus_ok : undefined,
  };
}

const ENCOURAGING_FALLBACK =
  "Your grid favors clean electrons more often than you think. " +
  "When wind and sun are strong and prices dip, shifting a load of laundry or charging " +
  "can trim both your bill and your footprint. Small moves add up for people and the planet.";

/** RSC-safe plain object (Mongo ObjectId / Date break Client Component props). */
function toPlainLatestDoc(doc: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!doc) return null;
  const ts = doc.timestamp;
  const timestamp =
    ts instanceof Date
      ? ts.toISOString()
      : typeof ts === "string"
        ? ts
        : String(ts);
  const id = doc._id;
  return {
    _id: id != null ? String(id as object) : "",
    user_id: doc.user_id,
    timestamp,
    price_data: doc.price_data,
    fuel_mix: doc.fuel_mix,
    renewable_pct: doc.renewable_pct,
    eco_efficiency_score: doc.eco_efficiency_score,
    local_demand_mw: doc.local_demand_mw,
    z_score: doc.z_score,
    gridstatus_ok: doc.gridstatus_ok,
    llm_route: doc.llm_route,
    llm_analysis: doc.llm_analysis,
    social_message: doc.social_message,
    action_taken: doc.action_taken,
  };
}

export async function getEnergySnapshot(userId: string): Promise<EnergySnapshot> {
  const db = await getDb();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [rows, lastForStatus] = await Promise.all([
    db
      .collection("energy_logs")
      .find({ user_id: userId, timestamp: { $gte: since } })
      .sort({ timestamp: 1 })
      .limit(2000)
      .toArray(),
    db
      .collection("energy_logs")
      .findOne({ user_id: userId }, { sort: { timestamp: -1 } }),
  ]);

  const latestDoc = lastForStatus as Record<string, unknown> | null;
  const hasDenorm =
    latestDoc != null &&
    (typeof latestDoc.total_dollars_saved === "number" ||
      typeof latestDoc.total_carbon_saved_kg === "number" ||
      typeof latestDoc.total_carbon_saved === "number");

  const statsDoc = hasDenorm
    ? null
    : await db.collection("user_stats").findOne({ user_id: userId });

  const logs: EnergyLogPoint[] = [];
  for (const r of rows) {
    const p = docToPoint(r as Record<string, unknown>);
    if (p) logs.push(p);
  }

  const latest = latestDoc ? docToPoint(latestDoc) : null;

  const lastTs = latestDoc?.timestamp
    ? new Date(latestDoc.timestamp as string).getTime()
    : null;
  const lastPollMinutesAgo =
    lastTs != null ? (Date.now() - lastTs) / 60000 : null;
  const active = lastPollMinutesAgo !== null && lastPollMinutesAgo < 20;
  const lastPolledLabel = formatLastPolledLabel(lastPollMinutesAgo);

  const currentScore = latest?.eco_efficiency_score ?? 0;
  const dialPercent = normalizeDialPercent(logs, currentScore);

  const latestPrice = latest?.price_cents ?? 0;
  const pz = priceZScoreFromLogs(logs, latestPrice);
  const pricePulseAmber = pz !== null && pz > 2;

  const goldenWindows = findGoldenWindows(logs);

  const rawSocial =
    latestDoc && typeof latestDoc.social_message === "string"
      ? latestDoc.social_message
      : latestDoc && typeof latestDoc.llm_analysis === "string"
        ? latestDoc.llm_analysis
        : "";
  const insightFromLlm = rawSocial.trim().length > 0;
  const insight = insightFromLlm ? rawSocial.trim() : ENCOURAGING_FALLBACK;

  const ecoZ =
    latest?.z_score != null && Number.isFinite(latest.z_score)
      ? latest.z_score
      : null;

  const stats = {
    total_carbon_saved_kg: Number(
      latestDoc?.total_carbon_saved_kg ??
        latestDoc?.total_carbon_saved ??
        statsDoc?.total_carbon_saved ??
        statsDoc?.total_carbon_saved_kg ??
        0,
    ),
    total_dollars_saved: Number(
      latestDoc?.total_dollars_saved ?? statsDoc?.total_dollars_saved ?? 0,
    ),
  };

  return {
    userId,
    stats,
    logs,
    latest,
    latestRaw: toPlainLatestDoc(latestDoc),
    dialPercent,
    priceZScore: pz,
    pricePulseAmber,
    goldenWindows,
    insight,
    insightFromLlm,
    ecoZScore: ecoZ,
    status: {
      active,
      lastPollMinutesAgo:
        lastPollMinutesAgo !== null ? Math.round(lastPollMinutesAgo) : null,
      lastPolledLabel,
    },
  };
}
