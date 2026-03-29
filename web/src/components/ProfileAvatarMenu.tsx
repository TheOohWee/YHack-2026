"use client";

import { createClient } from "@/lib/supabase/client";
import {
  User,
  LogOut,
  UserCircle,
  Pencil,
  Users,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
};

type GamificationStats = {
  streak: { currentStreak: number };
  totalDollarsSaved: number;
};

function getInitials(name: string | null, email: string | null): string {
  if (name) {
    return name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  if (email) return email[0].toUpperCase();
  return "?";
}

export function ProfileAvatarMenu() {
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<GamificationStats | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => d.profile && setProfile(d.profile))
      .catch(() => {});

    fetch("/api/gamification")
      .then((r) => r.json())
      .then((d) => setStats(d))
      .catch(() => {});
  }, []);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  const handleSignOut = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  }, []);

  const initials = getInitials(profile?.full_name ?? null, profile?.email ?? null);
  const displayName = profile?.full_name || profile?.email || "User";

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-[var(--border-soft)] bg-[var(--surface)] text-sm font-semibold text-[var(--text-secondary)] transition-all hover:border-[var(--accent-soft)] hover:shadow-md overflow-hidden"
        aria-label="Profile menu"
        aria-expanded={open}
      >
        {profile?.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <span>{initials}</span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-72 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] shadow-[0_12px_40px_rgba(42,51,44,0.12)] z-50 overflow-hidden"
          role="menu"
        >
          {/* User info header */}
          <div className="flex items-center gap-3 border-b border-[var(--border-soft)] px-4 py-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--accent-wash)] text-sm font-semibold text-[var(--accent)] overflow-hidden">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[var(--text)]">
                {displayName}
              </p>
              {profile?.email && profile.full_name && (
                <p className="truncate text-xs text-[var(--text-muted)]">
                  {profile.email}
                </p>
              )}
              {profile?.bio && (
                <p className="mt-0.5 truncate text-xs text-[var(--text-muted)]">
                  {profile.bio}
                </p>
              )}
            </div>
          </div>

          {/* Score preview */}
          {stats && (
            <div className="flex items-center gap-2 border-b border-[var(--border-soft)] px-4 py-2.5">
              <Zap className="h-3.5 w-3.5 text-[var(--accent)]" />
              <span className="text-xs font-medium text-[var(--text-secondary)]">
                Streak {stats.streak.currentStreak} · ${stats.totalDollarsSaved.toFixed(2)} saved
              </span>
            </div>
          )}

          {/* Navigation links */}
          <div className="py-1.5">
            <Link
              href="/profile"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--accent-wash)] hover:text-[var(--accent)]"
              role="menuitem"
            >
              <UserCircle className="h-4 w-4" />
              View Profile
            </Link>
            <Link
              href="/profile?edit=true"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--accent-wash)] hover:text-[var(--accent)]"
              role="menuitem"
            >
              <Pencil className="h-4 w-4" />
              Edit Profile
            </Link>
            <Link
              href="/friends"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--accent-wash)] hover:text-[var(--accent)]"
              role="menuitem"
            >
              <Users className="h-4 w-4" />
              Friends
            </Link>
          </div>

          {/* Sign out */}
          <div className="border-t border-[var(--border-soft)] py-1.5">
            <button
              type="button"
              onClick={handleSignOut}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-[var(--text-muted)] transition-colors hover:bg-red-50 hover:text-red-600"
              role="menuitem"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
