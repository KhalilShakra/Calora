"use client";

import { applySignedInUser } from "@/lib/auth/session";
import { getProfile } from "@/lib/actions";
import { getSupabase, isCloudEnabled } from "@/lib/supabase/client";
import { Button, Card, Field, Input } from "@/components/ui";
import { APP_NAME, APP_TAGLINE } from "@/design/brand";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

function friendlyAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("invalid login")) return "Wrong email or password.";
  if (lower.includes("already registered") || lower.includes("already been registered")) {
    return "That email already has an account. Try signing in.";
  }
  if (lower.includes("password")) return "Password must be at least 6 characters.";
  if (lower.includes("email")) return "Enter a valid email address.";
  return message;
}

export function AuthScreen({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const cloud = isCloudEnabled();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const signup = mode === "signup";

  async function afterSession() {
    const profile = await getProfile();
    router.replace(profile?.onboardingCompletedAt ? "/" : "/onboarding");
    router.refresh();
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (!cloud) {
      setError("Cloud sync off — add Supabase keys");
      return;
    }
    const supabase = getSupabase();
    if (!supabase) {
      setError("Cloud sync off — add Supabase keys");
      return;
    }
    setBusy(true);
    try {
      if (signup) {
        const { data, error: signError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { display_name: email.trim().split("@")[0] },
          },
        });
        if (signError) {
          setError(friendlyAuthError(signError.message));
          return;
        }
        if (!data.session || !data.user) {
          setInfo("Check your email to confirm your account, then sign in.");
          return;
        }
        await applySignedInUser(data.user);
        await afterSession();
        return;
      }

      const { data, error: signError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signError || !data.user) {
        setError(friendlyAuthError(signError?.message ?? "Could not sign in."));
        return;
      }
      await applySignedInUser(data.user);
      await afterSession();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[80dvh] max-w-md flex-col gap-6 pt-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ff-primary">{APP_NAME}</p>
        <h1 className="mt-2 font-display text-3xl font-semibold">
          {signup ? "Create your forge" : "Welcome back"}
        </h1>
        <p className="mt-2 text-sm text-ff-dim">{APP_TAGLINE}</p>
      </header>

      <div className="grid grid-cols-2 gap-1 rounded-full bg-ff-muted p-1">
        <Link
          href="/login"
          className={`rounded-full px-2 py-2 text-center text-xs font-semibold ${
            !signup ? "bg-ff-primary text-slate-950" : "text-ff-dim"
          }`}
        >
          Sign in
        </Link>
        <Link
          href="/signup"
          className={`rounded-full px-2 py-2 text-center text-xs font-semibold ${
            signup ? "bg-ff-primary text-slate-950" : "text-ff-dim"
          }`}
        >
          Sign up
        </Link>
      </div>

      {!cloud && (
        <Card>
          <p className="text-sm text-ff-dim">Cloud sync off — add Supabase keys</p>
        </Card>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Email">
          <Input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
          />
        </Field>
        <Field label="Password">
          <Input
            type="password"
            autoComplete={signup ? "new-password" : "current-password"}
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={signup ? "At least 6 characters" : "Your password"}
          />
        </Field>

        {error && <p className="text-sm font-medium text-ff-danger">{error}</p>}
        {info && <p className="text-sm font-medium text-ff-primary">{info}</p>}

        <Button type="submit" className="w-full" disabled={busy || !cloud}>
          {busy ? (signup ? "Creating account…" : "Signing in…") : signup ? "Create account" : "Sign in"}
        </Button>
      </form>

      <p className="text-center text-sm text-ff-dim">
        {signup ? "Already forging?" : "New here?"}{" "}
        <Link href={signup ? "/login" : "/signup"} className="font-semibold text-ff-primary">
          {signup ? "Sign in" : "Create an account"}
        </Link>
      </p>
    </div>
  );
}
