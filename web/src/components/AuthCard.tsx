"use client";

import { createClient } from "@/lib/supabase/client";
import { Zap, Mail, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function AuthCard() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">(
    searchParams.get("mode") === "signup" ? "signup" : "signin"
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    searchParams.get("error") === "auth_failed"
      ? "Authentication failed. Please try again."
      : null
  );
  const [message, setMessage] = useState<string | null>(null);

  const supabase = createClient();

  async function handleGitHub() {
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: { full_name: fullName || undefined },
        },
      });
      if (error) {
        setError(error.message);
      } else {
        setMessage(
          "Check your email for a confirmation link to complete sign up."
        );
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setError(error.message);
      } else {
        // Successful sign-in — ensure profile exists then redirect
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const { data: existing } = await supabase
            .from("profiles")
            .select("id")
            .eq("id", user.id)
            .single();

          if (!existing) {
            await supabase.from("profiles").insert({
              id: user.id,
              email: user.email,
              full_name:
                user.user_metadata?.full_name ??
                user.user_metadata?.name ??
                null,
              avatar_url: user.user_metadata?.avatar_url ?? null,
            });
          }
        }

        router.push("/dashboard");
        return;
      }
    }

    setLoading(false);
  }

  const isSignUp = mode === "signup";

  return (
    <div
      className="w-full max-w-sm rounded-2xl border-2 p-8"
      style={{
        background: "var(--surface)",
        borderColor: "var(--border-soft)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      {/* Logo */}
      <div className="mb-6 flex flex-col items-center">
        <Link href="/" className="mb-4 flex items-center gap-2 text-sm" style={{ color: "var(--text-muted)" }}>
          <ArrowLeft size={14} />
          Back
        </Link>
        <div
          className="flex h-12 w-12 items-center justify-center rounded-full"
          style={{ background: "var(--accent-wash)" }}
        >
          <Zap size={22} style={{ color: "var(--accent)" }} />
        </div>
        <h1 className="mt-3 text-xl font-bold" style={{ color: "var(--text)" }}>
          {isSignUp ? "Create your account" : "Welcome back"}
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
          {isSignUp
            ? "Sign up to start tracking your energy"
            : "Sign in to your WattsUp dashboard"}
        </p>
      </div>

      {/* GitHub OAuth */}
      <button
        onClick={handleGitHub}
        disabled={loading}
        className="btn-calm-secondary mb-4 w-full gap-2"
      >
        <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
        Continue with GitHub
      </button>

      {/* Divider */}
      <div className="mb-4 flex items-center gap-3">
        <div className="h-px flex-1" style={{ background: "var(--border-soft)" }} />
        <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
          or
        </span>
        <div className="h-px flex-1" style={{ background: "var(--border-soft)" }} />
      </div>

      {/* Email form */}
      <form onSubmit={handleEmailSubmit} className="flex flex-col gap-3">
        {isSignUp && (
          <input
            type="text"
            placeholder="Full name (optional)"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="input-calm"
            disabled={loading}
          />
        )}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input-calm"
          required
          disabled={loading}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input-calm"
          required
          minLength={6}
          disabled={loading}
        />

        <button type="submit" disabled={loading} className="btn-calm mt-1 gap-2">
          {loading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Mail size={18} />
          )}
          {isSignUp ? "Sign up" : "Sign in"}
        </button>
      </form>

      {/* Error / message */}
      {error && (
        <p
          className="mt-4 rounded-xl px-4 py-2 text-sm"
          style={{
            background: "#fef2f2",
            color: "#b91c1c",
            border: "1px solid #fecaca",
          }}
        >
          {error}
        </p>
      )}
      {message && (
        <p
          className="mt-4 rounded-xl px-4 py-2 text-sm"
          style={{
            background: "var(--accent-wash)",
            color: "var(--accent)",
            border: "1px solid var(--accent-soft)",
          }}
        >
          {message}
        </p>
      )}

      {/* Toggle mode */}
      <p
        className="mt-5 text-center text-sm"
        style={{ color: "var(--text-muted)" }}
      >
        {isSignUp ? "Already have an account?" : "Don\u2019t have an account?"}{" "}
        <button
          type="button"
          onClick={() => {
            setMode(isSignUp ? "signin" : "signup");
            setError(null);
            setMessage(null);
          }}
          className="font-semibold underline"
          style={{ color: "var(--accent)" }}
        >
          {isSignUp ? "Sign in" : "Register"}
        </button>
      </p>
    </div>
  );
}
