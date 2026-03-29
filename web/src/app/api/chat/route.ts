export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

const K2_ENDPOINT =
  process.env.K2_ENDPOINT || "https://api.k2think.ai/v1/chat/completions";
const K2_MODEL = process.env.K2_MODEL || "MBZUAI-IFM/K2-Think-v2";
const K2_API_KEY = process.env.K2_API_KEY || "";

const SYSTEM_PROMPT = `You are WattsUp AI, an energy advisor powered by K2 Think V2. You help Illinois households save money and reduce carbon emissions by reasoning about real-time electricity grid data.

You have access to LIVE grid data injected below. Use it to give specific, quantitative advice. Show your reasoning with actual numbers — don't just give generic tips.

When asked about timing (when to run appliances, charge EVs, etc.), reason step-by-step through:
1. Current price vs 24h average — is it cheap or expensive right now?
2. Current fuel mix — how clean is the grid right now?
3. Recent trends — is it getting better or worse?
4. Your recommendation with specific numbers

Keep responses concise (2-4 paragraphs max). Be encouraging but data-driven. Use plain language, not jargon. When you cite numbers, round to 1 decimal place.`;

type ChatMessage = { role: "user" | "assistant"; content: string };

async function getGridContext(userId: string): Promise<string> {
  try {
    const db = await getDb();
    const coll = db.collection("energy_logs");

    const latest = await coll
      .find({ user_id: userId })
      .sort({ timestamp: -1 })
      .limit(1)
      .toArray();

    const recent = await coll
      .find({ user_id: userId })
      .sort({ timestamp: -1 })
      .limit(24)
      .toArray();

    if (!latest.length) {
      return "No grid data available yet. Answer based on general Illinois/ComEd knowledge.";
    }

    const doc = latest[0];
    const price = doc.price_data?.current_price ?? doc.price_cents ?? null;
    const avg24h = doc.price_data?.avg_24h ?? null;
    const fuel = doc.fuel_mix ?? {};
    const renewablePct = doc.renewable_pct ?? null;
    const ecoScore = doc.eco_efficiency_score ?? null;
    const zScore = doc.z_score ?? null;
    const demandMw = doc.local_demand_mw ?? null;
    const ts = doc.timestamp
      ? new Date(doc.timestamp).toISOString()
      : "unknown";

    // Recent price trend
    const recentPrices = recent
      .map((d) => d.price_data?.current_price ?? d.price_cents)
      .filter((p: unknown): p is number => typeof p === "number");
    const priceMin = recentPrices.length ? Math.min(...recentPrices) : null;
    const priceMax = recentPrices.length ? Math.max(...recentPrices) : null;

    // Stats
    const stats = await db
      .collection("user_stats")
      .findOne({ user_id: userId });

    return `LIVE GRID DATA (as of ${ts}):
- Current ComEd hourly price: ${price !== null ? price.toFixed(1) + " cents/kWh" : "unavailable"}
- 24h average price: ${avg24h !== null ? avg24h.toFixed(1) + " cents/kWh" : "unavailable"}
- 24h price range: ${priceMin !== null ? priceMin.toFixed(1) : "?"} - ${priceMax !== null ? priceMax.toFixed(1) : "?"} cents/kWh
- Renewable energy: ${renewablePct !== null ? renewablePct.toFixed(1) + "%" : "unavailable"}
- Fuel mix: nuclear ${(fuel.nuclear ?? 0).toFixed(1)}%, coal ${(fuel.coal ?? 0).toFixed(1)}%, natural gas ${(fuel.natural_gas ?? 0).toFixed(1)}%, wind ${(fuel.wind ?? 0).toFixed(1)}%, solar ${(fuel.solar ?? 0).toFixed(1)}%, battery ${(fuel.battery_storage ?? 0).toFixed(1)}%, imports ${(fuel.imports ?? 0).toFixed(1)}%
- Grid demand: ${demandMw !== null ? demandMw.toFixed(0) + " MW" : "unavailable"}
- Eco-efficiency score: ${ecoScore !== null ? ecoScore.toFixed(1) : "unavailable"}
- Z-score (vs recent history): ${zScore !== null ? zScore.toFixed(2) : "unavailable"}
- User total carbon saved: ${stats?.total_carbon_saved_kg?.toFixed(1) ?? "0"} kg
- User total dollars saved: $${stats?.total_dollars_saved?.toFixed(2) ?? "0.00"}`;
  } catch (e) {
    return "Grid data fetch failed. Answer based on general knowledge.";
  }
}

export async function POST(req: NextRequest) {
  if (!K2_API_KEY) {
    return NextResponse.json(
      { error: "K2_API_KEY is not configured" },
      { status: 503 }
    );
  }

  let body: { messages: ChatMessage[]; userId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { messages = [], userId = "demo-user" } = body;
  if (!messages.length) {
    return NextResponse.json(
      { error: "No messages provided" },
      { status: 400 }
    );
  }

  const gridContext = await getGridContext(userId);

  const k2Messages = [
    { role: "system" as const, content: SYSTEM_PROMPT + "\n\n" + gridContext },
    ...messages.slice(-10).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  ];

  try {
    const res = await fetch(K2_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${K2_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: K2_MODEL,
        messages: k2Messages,
        temperature: 0.3,
        max_tokens: 4000,
        stream: false,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json(
        { error: `K2 API error: ${res.status} ${errText}` },
        { status: 502 }
      );
    }

    const data = await res.json();
    let content: string =
      data?.choices?.[0]?.message?.content ?? "No response from K2.";

    // Strip <think> reasoning tags — keep only the final answer
    content = content.replace(/<think>[\s\S]*?<\/think>/g, "").trim();

    return NextResponse.json({
      message: { role: "assistant", content },
      model: K2_MODEL,
    });
  } catch (e) {
    return NextResponse.json(
      { error: `K2 request failed: ${e instanceof Error ? e.message : e}` },
      { status: 502 }
    );
  }
}
