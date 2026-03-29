"use client";

import { ProfileAvatarMenu } from "@/components/ProfileAvatarMenu";
import {
  ArrowLeft,
  CalendarDays,
  Camera,
  Check,
  DollarSign,
  Flame,
  Leaf,
  Loader2,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";

type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
};

type GamificationStats = {
  streak: {
    currentStreak: number;
    longestStreak: number;
    streakCalendarDays: number;
    lastPollWasGreen: boolean | null;
  };
  totalDollarsSaved: number;
  totalCarbonSavedKg: number;
};

function getInitials(name: string | null, email: string | null): string {
  if (name) {
    return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
  }
  if (email) return email[0].toUpperCase();
  return "?";
}

function ProfilePageContent() {
  const searchParams = useSearchParams();
  const startEditing = searchParams.get("edit") === "true";

  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<GamificationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/profile").then((r) => r.json()),
      fetch("/api/gamification").then((r) => r.json()),
    ]).then(([profileRes, gamRes]) => {
      if (profileRes.profile) {
        setProfile(profileRes.profile);
        setEditName(profileRes.profile.full_name ?? "");
        setEditBio(profileRes.profile.bio ?? "");
      }
      setStats(gamRes);
      setLoading(false);
      if (startEditing) setEditing(true);
    }).catch(() => setLoading(false));
  }, [startEditing]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: editName, bio: editBio }),
      });
      const data = await res.json();
      if (data.profile) {
        setProfile(data.profile);
        setEditing(false);
        setMessage({ type: "success", text: "Profile updated" });
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: "error", text: data.error || "Failed to save" });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to save" });
    }
    setSaving(false);
  }, [editName, editBio]);

  const handleAvatarUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    setMessage(null);
    try {
      const form = new FormData();
      form.append("avatar", file);
      const res = await fetch("/api/profile/avatar", { method: "POST", body: form });
      const data = await res.json();
      if (data.avatar_url) {
        setProfile((p) => p ? { ...p, avatar_url: data.avatar_url } : p);
        setMessage({ type: "success", text: "Avatar updated" });
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: "error", text: data.error || "Upload failed" });
      }
    } catch {
      setMessage({ type: "error", text: "Upload failed" });
    }
    setUploadingAvatar(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const handleRemoveAvatar = useCallback(async () => {
    setUploadingAvatar(true);
    try {
      await fetch("/api/profile/avatar", { method: "DELETE" });
      setProfile((p) => p ? { ...p, avatar_url: null } : p);
      setMessage({ type: "success", text: "Avatar removed" });
      setTimeout(() => setMessage(null), 3000);
    } catch {}
    setUploadingAvatar(false);
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-[var(--text-muted)]">Could not load profile.</p>
      </div>
    );
  }

  const initials = getInitials(profile.full_name, profile.email);

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-[var(--border-soft)] bg-[var(--surface)]/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3 sm:px-6">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--accent)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Link>
          <ProfileAvatarMenu />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        {/* Message toast */}
        {message && (
          <div
            className={`mb-6 rounded-xl px-4 py-3 text-sm font-medium ${
              message.type === "success"
                ? "bg-[var(--accent-wash)] text-[var(--accent)]"
                : "bg-red-50 text-red-600"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Profile header card */}
        <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] p-6 shadow-[var(--shadow-card)] sm:p-8">
          <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
            {/* Avatar */}
            <div className="relative group">
              <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-[var(--border-soft)] bg-[var(--accent-wash)] text-2xl font-bold text-[var(--accent)] overflow-hidden">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span>{initials}</span>
                )}
              </div>
              {/* Avatar actions overlay */}
              <div className="absolute inset-0 flex items-center justify-center gap-1 rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-[var(--text)] transition-colors hover:bg-white"
                  title="Upload photo"
                >
                  {uploadingAvatar ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                </button>
                {profile.avatar_url && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    disabled={uploadingAvatar}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-red-500 transition-colors hover:bg-white"
                    title="Remove photo"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>

            {/* Info */}
            <div className="flex-1 text-center sm:text-left">
              {editing ? (
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">
                      Display name
                    </label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      maxLength={100}
                      className="input-calm w-full !min-h-[42px] !text-base"
                      placeholder="Your name"
                    />
                  </div>
                  <div>
                    <label className="mb-1 flex items-center justify-between text-xs font-medium text-[var(--text-muted)]">
                      Bio
                      <span className="tabular-nums">{editBio.length}/200</span>
                    </label>
                    <textarea
                      value={editBio}
                      onChange={(e) => setEditBio(e.target.value.slice(0, 200))}
                      maxLength={200}
                      rows={2}
                      className="input-calm w-full !min-h-0 resize-none !text-sm"
                      placeholder="A short bio..."
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={saving}
                      className="btn-calm !px-4 !py-2 !min-h-0 !text-sm inline-flex items-center gap-1.5"
                    >
                      {saving ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Check className="h-3.5 w-3.5" />
                      )}
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(false);
                        setEditName(profile.full_name ?? "");
                        setEditBio(profile.bio ?? "");
                      }}
                      className="btn-calm-secondary !px-4 !py-2 !min-h-0 !text-sm inline-flex items-center gap-1.5"
                    >
                      <X className="h-3.5 w-3.5" />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <h1 className="text-2xl font-semibold text-[var(--text)]">
                    {profile.full_name || "No name set"}
                  </h1>
                  <p className="mt-0.5 text-sm text-[var(--text-muted)]">
                    {profile.email}
                  </p>
                  {profile.bio ? (
                    <p className="mt-2 text-sm text-[var(--text-secondary)] leading-relaxed">
                      {profile.bio}
                    </p>
                  ) : (
                    <p className="mt-2 text-sm italic text-[var(--text-muted)]">
                      No bio yet
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-[var(--border-soft)] bg-[var(--surface-muted)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--accent-soft)] hover:bg-[var(--accent-wash)] hover:text-[var(--accent)]"
                  >
                    <Pencil className="h-3 w-3" />
                    Edit profile
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Gamification stats */}
        <div className="mt-6 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] p-6 shadow-[var(--shadow-card)]">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Your progress
          </h2>
          {stats ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="flex items-center gap-2.5 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-muted)] px-3.5 py-3">
                <Flame className="h-5 w-5 shrink-0 text-orange-500" />
                <div>
                  <p className="text-xs text-[var(--text-muted)]">Streak</p>
                  <p className="text-lg font-semibold tabular-nums text-[var(--text)]">
                    {stats.streak.currentStreak}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-muted)] px-3.5 py-3">
                <Leaf className="h-5 w-5 shrink-0 text-emerald-600" />
                <div>
                  <p className="text-xs text-[var(--text-muted)]">Best run</p>
                  <p className="text-lg font-semibold tabular-nums text-[var(--text)]">
                    {stats.streak.longestStreak}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-muted)] px-3.5 py-3">
                <CalendarDays className="h-5 w-5 shrink-0 text-teal-600" />
                <div>
                  <p className="text-xs text-[var(--text-muted)]">Green days</p>
                  <p className="text-lg font-semibold tabular-nums text-[var(--text)]">
                    {stats.streak.streakCalendarDays}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-muted)] px-3.5 py-3">
                <DollarSign className="h-5 w-5 shrink-0 text-[var(--accent)]" />
                <div>
                  <p className="text-xs text-[var(--text-muted)]">Saved</p>
                  <p className="text-lg font-semibold tabular-nums text-[var(--text)]">
                    ${stats.totalDollarsSaved.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-20 animate-pulse rounded-xl bg-[var(--surface-muted)]" />
              ))}
            </div>
          )}
          {stats && stats.totalCarbonSavedKg > 0 && (
            <p className="mt-3 text-xs text-[var(--text-muted)]">
              {stats.totalCarbonSavedKg.toFixed(1)} kg CO₂ avoided
            </p>
          )}
        </div>

        {/* Friends section */}
        <div className="mt-6 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] p-6 shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Friends
            </h2>
            <Link
              href="/friends"
              className="text-xs font-medium text-[var(--accent)] transition-colors hover:text-[var(--accent-hover)]"
            >
              View all
            </Link>
          </div>
          <FriendsPreview />
        </div>
      </main>
    </div>
  );
}

function FriendsPreview() {
  const [friends, setFriends] = useState<
    { requestId: string; profile: { id: string; full_name: string | null; avatar_url: string | null } }[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/friends")
      .then((r) => r.json())
      .then((d) => {
        setFriends(d.friends ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="mt-3 flex gap-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-10 w-10 animate-pulse rounded-full bg-[var(--surface-muted)]" />
        ))}
      </div>
    );
  }

  if (friends.length === 0) {
    return (
      <p className="mt-3 text-sm text-[var(--text-muted)]">
        No friends yet.{" "}
        <Link href="/friends" className="text-[var(--accent)] hover:underline">
          Find people
        </Link>
      </p>
    );
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {friends.slice(0, 8).map((f) => {
        const name = f.profile?.full_name;
        const avatar = f.profile?.avatar_url;
        const init = name ? name[0].toUpperCase() : "?";
        return (
          <div
            key={f.requestId}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-soft)] bg-[var(--accent-wash)] text-xs font-semibold text-[var(--accent)] overflow-hidden"
            title={name ?? "Friend"}
          >
            {avatar ? (
              <img src={avatar} alt="" className="h-full w-full object-cover" />
            ) : (
              init
            )}
          </div>
        );
      })}
      {friends.length > 8 && (
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-soft)] bg-[var(--surface-muted)] text-xs font-medium text-[var(--text-muted)]">
          +{friends.length - 8}
        </div>
      )}
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--accent)]" />
        </div>
      }
    >
      <ProfilePageContent />
    </Suspense>
  );
}
