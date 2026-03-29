"use client";

import { ProfileAvatarMenu } from "@/components/ProfileAvatarMenu";
import {
  ArrowLeft,
  Check,
  Clock,
  Loader2,
  Search,
  UserMinus,
  UserPlus,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type FriendProfile = {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  bio: string | null;
};

type FriendEntry = {
  requestId: string;
  profile: FriendProfile;
};

type SearchResult = FriendProfile & {
  connectionStatus: "none" | "friends" | "request_sent" | "request_received";
  requestId: string | null;
};

function getInitials(name: string | null, email: string | null): string {
  if (name) return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
  if (email) return email[0].toUpperCase();
  return "?";
}

function SmallAvatar({ url, name, email }: { url: string | null; name: string | null; email: string | null }) {
  const initials = getInitials(name, email);
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--border-soft)] bg-[var(--accent-wash)] text-xs font-semibold text-[var(--accent)] overflow-hidden">
      {url ? (
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}

export default function FriendsPage() {
  const [friends, setFriends] = useState<FriendEntry[]>([]);
  const [incoming, setIncoming] = useState<FriendEntry[]>([]);
  const [outgoing, setOutgoing] = useState<FriendEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadFriends = useCallback(async () => {
    try {
      const res = await fetch("/api/friends");
      const data = await res.json();
      setFriends(data.friends ?? []);
      setIncoming(data.incoming ?? []);
      setOutgoing(data.outgoing ?? []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    loadFriends();
  }, [loadFriends]);

  // Debounced search
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/friends/search?q=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        setSearchResults(data.results ?? []);
      } catch {}
      setSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const sendRequest = useCallback(async (receiverId: string) => {
    setActionLoading(receiverId);
    try {
      await fetch("/api/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiverId }),
      });
      await loadFriends();
      // Update search results
      setSearchResults((prev) =>
        prev.map((r) => r.id === receiverId ? { ...r, connectionStatus: "request_sent" as const } : r)
      );
    } catch {}
    setActionLoading(null);
  }, [loadFriends]);

  const respondToRequest = useCallback(async (requestId: string, action: "accepted" | "rejected") => {
    setActionLoading(requestId);
    try {
      await fetch("/api/friends", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action }),
      });
      await loadFriends();
    } catch {}
    setActionLoading(null);
  }, [loadFriends]);

  const removeFriend = useCallback(async (requestId: string) => {
    setActionLoading(requestId);
    try {
      await fetch(`/api/friends?requestId=${requestId}`, { method: "DELETE" });
      await loadFriends();
    } catch {}
    setActionLoading(null);
  }, [loadFriends]);

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-[var(--border-soft)] bg-[var(--surface)]/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3 sm:px-6">
          <Link
            href="/profile"
            className="flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--accent)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Profile
          </Link>
          <ProfileAvatarMenu />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-semibold text-[var(--text)]">Friends</h1>

        {/* Search */}
        <div className="relative mt-5">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or email..."
            className="input-calm w-full !min-h-[42px] !pl-10 !text-sm"
          />
          {searching && (
            <Loader2 className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[var(--text-muted)]" />
          )}
        </div>

        {/* Search results */}
        {searchResults.length > 0 && (
          <div className="mt-3 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] shadow-[var(--shadow-card)] overflow-hidden">
            <p className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] border-b border-[var(--border-soft)]">
              Search results
            </p>
            <div className="divide-y divide-[var(--border-soft)]">
              {searchResults.map((r) => (
                <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                  <SmallAvatar url={r.avatar_url} name={r.full_name} email={r.email} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[var(--text)]">
                      {r.full_name || r.email}
                    </p>
                    {r.bio && (
                      <p className="truncate text-xs text-[var(--text-muted)]">{r.bio}</p>
                    )}
                  </div>
                  {r.connectionStatus === "none" && (
                    <button
                      type="button"
                      onClick={() => sendRequest(r.id)}
                      disabled={actionLoading === r.id}
                      className="flex items-center gap-1.5 rounded-full border border-[var(--accent-soft)] bg-[var(--accent-wash)] px-3 py-1.5 text-xs font-medium text-[var(--accent)] transition-colors hover:bg-[var(--accent)] hover:text-white disabled:opacity-50"
                    >
                      {actionLoading === r.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <UserPlus className="h-3 w-3" />
                      )}
                      Add
                    </button>
                  )}
                  {r.connectionStatus === "friends" && (
                    <span className="flex items-center gap-1 text-xs font-medium text-[var(--accent)]">
                      <Check className="h-3 w-3" /> Friends
                    </span>
                  )}
                  {r.connectionStatus === "request_sent" && (
                    <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                      <Clock className="h-3 w-3" /> Sent
                    </span>
                  )}
                  {r.connectionStatus === "request_received" && (
                    <button
                      type="button"
                      onClick={() => r.requestId && respondToRequest(r.requestId, "accepted")}
                      disabled={actionLoading === r.requestId}
                      className="flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-50"
                    >
                      <Check className="h-3 w-3" /> Accept
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <div className="mt-8 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--accent)]" />
          </div>
        ) : (
          <>
            {/* Incoming requests */}
            {incoming.length > 0 && (
              <section className="mt-6">
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                  Friend requests ({incoming.length})
                </h2>
                <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] shadow-[var(--shadow-card)] divide-y divide-[var(--border-soft)] overflow-hidden">
                  {incoming.map((r) => (
                    <div key={r.requestId} className="flex items-center gap-3 px-4 py-3">
                      <SmallAvatar url={r.profile?.avatar_url} name={r.profile?.full_name} email={r.profile?.email} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-[var(--text)]">
                          {r.profile?.full_name || r.profile?.email}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => respondToRequest(r.requestId, "accepted")}
                          disabled={actionLoading === r.requestId}
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent)] text-white transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-50"
                          title="Accept"
                        >
                          {actionLoading === r.requestId ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Check className="h-3.5 w-3.5" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => respondToRequest(r.requestId, "rejected")}
                          disabled={actionLoading === r.requestId}
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border-soft)] bg-[var(--surface-muted)] text-[var(--text-muted)] transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
                          title="Reject"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Outgoing requests */}
            {outgoing.length > 0 && (
              <section className="mt-6">
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                  Pending sent ({outgoing.length})
                </h2>
                <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] shadow-[var(--shadow-card)] divide-y divide-[var(--border-soft)] overflow-hidden">
                  {outgoing.map((r) => (
                    <div key={r.requestId} className="flex items-center gap-3 px-4 py-3">
                      <SmallAvatar url={r.profile?.avatar_url} name={r.profile?.full_name} email={r.profile?.email} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-[var(--text)]">
                          {r.profile?.full_name || r.profile?.email}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFriend(r.requestId)}
                        disabled={actionLoading === r.requestId}
                        className="flex items-center gap-1.5 rounded-full border border-[var(--border-soft)] px-3 py-1.5 text-xs font-medium text-[var(--text-muted)] transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
                      >
                        {actionLoading === r.requestId ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <X className="h-3 w-3" />
                        )}
                        Cancel
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Friends list */}
            <section className="mt-6">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                Friends {friends.length > 0 && `(${friends.length})`}
              </h2>
              {friends.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[var(--border-soft)] bg-[var(--surface-muted)]/50 px-6 py-10 text-center">
                  <p className="text-sm text-[var(--text-muted)]">
                    No friends yet. Search above to find people.
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] shadow-[var(--shadow-card)] divide-y divide-[var(--border-soft)] overflow-hidden">
                  {friends.map((f) => (
                    <div key={f.requestId} className="flex items-center gap-3 px-4 py-3">
                      <SmallAvatar url={f.profile?.avatar_url} name={f.profile?.full_name} email={f.profile?.email} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-[var(--text)]">
                          {f.profile?.full_name || f.profile?.email}
                        </p>
                        {f.profile?.bio && (
                          <p className="truncate text-xs text-[var(--text-muted)]">{f.profile.bio}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFriend(f.requestId)}
                        disabled={actionLoading === f.requestId}
                        className="flex items-center gap-1.5 rounded-full border border-[var(--border-soft)] px-3 py-1.5 text-xs font-medium text-[var(--text-muted)] transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
                        title="Remove friend"
                      >
                        {actionLoading === f.requestId ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <UserMinus className="h-3 w-3" />
                        )}
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
