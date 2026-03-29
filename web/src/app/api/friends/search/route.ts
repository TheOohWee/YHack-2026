import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/** GET /api/friends/search?q=... — search users by name or email */
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();

  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  // Search by name or email (case-insensitive)
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, email, avatar_url, bio")
    .or(`full_name.ilike.%${q}%,email.ilike.%${q}%`)
    .neq("id", user.id)
    .limit(20);

  // Get existing relationships
  const { data: relationships } = await supabase
    .from("friend_requests")
    .select("id, sender_id, receiver_id, status")
    .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
    .in("status", ["pending", "accepted"]);

  const results = (profiles ?? []).map((p) => {
    const rel = (relationships ?? []).find(
      (r) =>
        (r.sender_id === p.id || r.receiver_id === p.id)
    );

    let connectionStatus: "none" | "friends" | "request_sent" | "request_received" = "none";
    if (rel) {
      if (rel.status === "accepted") {
        connectionStatus = "friends";
      } else if (rel.sender_id === user.id) {
        connectionStatus = "request_sent";
      } else {
        connectionStatus = "request_received";
      }
    }

    return {
      ...p,
      connectionStatus,
      requestId: rel?.id ?? null,
    };
  });

  return NextResponse.json({ results });
}
