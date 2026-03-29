import { getEnergySnapshot } from "@/lib/energy-service";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const userId =
    req.nextUrl.searchParams.get("userId") ||
    process.env.WATTSUP_DEFAULT_USER_ID ||
    "demo-user";

  if (!process.env.MONGODB_URI) {
    return NextResponse.json(
      { polling: false, active: false, lastPollMinutesAgo: null },
      { status: 503 },
    );
  }

  try {
    const { status } = await getEnergySnapshot(userId);
    return NextResponse.json({
      userId,
      polling: status.active,
      active: status.active,
      lastPollMinutesAgo: status.lastPollMinutesAgo,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
