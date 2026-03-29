import { getDb } from "@/lib/mongodb";
import { DASHBOARD_USER_ID } from "@/lib/dashboard-user";
import { DEMO_GREEN_STREAK_FALLBACK } from "@/lib/demo-streak";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/** GET /api/gamification — fetch gamification stats from MongoDB */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = await getDb();
    const userId = DASHBOARD_USER_ID;

    const [streakDoc, statsDoc, latestLog] = await Promise.all([
      db.collection("streaks").findOne({ user_id: userId }),
      db.collection("user_stats").findOne({ user_id: userId }),
      db.collection("energy_logs").findOne(
        { user_id: userId },
        { sort: { timestamp: -1 } }
      ),
    ]);

    const streak = streakDoc
      ? {
          currentStreak: Math.max(0, Number(streakDoc.current_streak ?? streakDoc.currentStreak ?? 0)),
          longestStreak: Math.max(0, Number(streakDoc.longest_streak ?? streakDoc.longestStreak ?? 0)),
          streakCalendarDays: Math.max(0, Number(streakDoc.streak_calendar_days ?? streakDoc.streakCalendarDays ?? 0)),
          lastPollWasGreen: streakDoc.last_poll_was_green ?? null,
        }
      : { ...DEMO_GREEN_STREAK_FALLBACK };

    const totalDollarsSaved = Number(
      latestLog?.total_dollars_saved ?? statsDoc?.total_dollars_saved ?? 0
    );
    const totalCarbonSavedKg = Number(
      latestLog?.total_carbon_saved_kg ?? latestLog?.total_carbon_saved ?? statsDoc?.total_carbon_saved_kg ?? 0
    );

    return NextResponse.json({
      streak,
      totalDollarsSaved: Math.round(totalDollarsSaved * 100) / 100,
      totalCarbonSavedKg: Math.round(totalCarbonSavedKg * 100) / 100,
    });
  } catch {
    // If MongoDB isn't available, return fallback
    return NextResponse.json({
      streak: { ...DEMO_GREEN_STREAK_FALLBACK },
      totalDollarsSaved: 0,
      totalCarbonSavedKg: 0,
    });
  }
}
