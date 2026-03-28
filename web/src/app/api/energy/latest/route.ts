import { getEnergySnapshot } from "@/lib/energy-service";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const userId =
    req.nextUrl.searchParams.get("userId") ||
    process.env.WATTSUP_DEFAULT_USER_ID ||
    "demo-user";

  if (!process.env.MONGODB_URI) {
    return NextResponse.json({ latest: null }, { status: 503 });
  }

  try {
    const snap = await getEnergySnapshot(userId);
    return NextResponse.json({
      userId,
      latest: snap.latest,
      dialPercent: snap.dialPercent,
      priceZScore: snap.priceZScore,
      pricePulseAmber: snap.pricePulseAmber,
      goldenWindows: snap.goldenWindows,
      insight: snap.insight,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
