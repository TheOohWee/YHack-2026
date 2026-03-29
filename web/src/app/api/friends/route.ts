import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/** GET /api/friends — list accepted friends + incoming/outgoing requests */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Accepted friends where I'm sender
  const { data: sentAccepted } = await supabase
    .from("friend_requests")
    .select("id, receiver_id, created_at, profiles!friend_requests_receiver_id_fkey(id, full_name, email, avatar_url, bio)")
    .eq("sender_id", user.id)
    .eq("status", "accepted");

  // Accepted friends where I'm receiver
  const { data: receivedAccepted } = await supabase
    .from("friend_requests")
    .select("id, sender_id, created_at, profiles!friend_requests_sender_id_fkey(id, full_name, email, avatar_url, bio)")
    .eq("receiver_id", user.id)
    .eq("status", "accepted");

  // Incoming pending requests
  const { data: incoming } = await supabase
    .from("friend_requests")
    .select("id, sender_id, created_at, profiles!friend_requests_sender_id_fkey(id, full_name, email, avatar_url, bio)")
    .eq("receiver_id", user.id)
    .eq("status", "pending");

  // Outgoing pending requests
  const { data: outgoing } = await supabase
    .from("friend_requests")
    .select("id, receiver_id, created_at, profiles!friend_requests_receiver_id_fkey(id, full_name, email, avatar_url, bio)")
    .eq("sender_id", user.id)
    .eq("status", "pending");

  const friends = [
    ...(sentAccepted ?? []).map((r) => ({
      requestId: r.id,
      profile: r.profiles,
      since: r.created_at,
    })),
    ...(receivedAccepted ?? []).map((r) => ({
      requestId: r.id,
      profile: r.profiles,
      since: r.created_at,
    })),
  ];

  return NextResponse.json({
    friends,
    incoming: (incoming ?? []).map((r) => ({
      requestId: r.id,
      profile: r.profiles,
      createdAt: r.created_at,
    })),
    outgoing: (outgoing ?? []).map((r) => ({
      requestId: r.id,
      profile: r.profiles,
      createdAt: r.created_at,
    })),
  });
}

/** POST /api/friends — send a friend request */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { receiverId } = await request.json();

  if (!receiverId || receiverId === user.id) {
    return NextResponse.json({ error: "Invalid receiver" }, { status: 400 });
  }

  // Check if request already exists in either direction
  const { data: existing } = await supabase
    .from("friend_requests")
    .select("id, status")
    .or(
      `and(sender_id.eq.${user.id},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${user.id})`
    )
    .in("status", ["pending", "accepted"]);

  if (existing && existing.length > 0) {
    return NextResponse.json(
      { error: "Request already exists or already friends" },
      { status: 409 }
    );
  }

  const { data, error } = await supabase
    .from("friend_requests")
    .insert({ sender_id: user.id, receiver_id: receiverId })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ request: data });
}

/** PATCH /api/friends — accept or reject a friend request */
export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { requestId, action } = await request.json();

  if (!requestId || !["accepted", "rejected"].includes(action)) {
    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
  }

  // Only the receiver can accept/reject
  const { data, error } = await supabase
    .from("friend_requests")
    .update({ status: action, updated_at: new Date().toISOString() })
    .eq("id", requestId)
    .eq("receiver_id", user.id)
    .eq("status", "pending")
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Request not found or not authorized" }, { status: 404 });
  }

  return NextResponse.json({ request: data });
}

/** DELETE /api/friends?requestId=... — remove a friend or cancel request */
export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const requestId = searchParams.get("requestId");

  if (!requestId) {
    return NextResponse.json({ error: "Missing requestId" }, { status: 400 });
  }

  // RLS ensures only sender or receiver can delete
  const { error } = await supabase
    .from("friend_requests")
    .delete()
    .eq("id", requestId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
