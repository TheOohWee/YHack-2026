import { getDb } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const userId =
    req.nextUrl.searchParams.get("userId") ||
    process.env.WATTSUP_DEFAULT_USER_ID ||
    "demo-user";

  if (!process.env.MONGODB_URI) {
    return NextResponse.json(
      { total_carbon_saved: 0, total_dollars_saved: 0 },
      { status: 503 },
    );
  }

  try {
    const db = await getDb();
    const doc = await db.collection("user_stats").findOne({ user_id: userId });
    return NextResponse.json({
      userId,
      total_carbon_saved: Number(
        doc?.total_carbon_saved ?? doc?.total_carbon_saved_kg ?? 0,
      ),
      total_dollars_saved: Number(doc?.total_dollars_saved ?? 0),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
