"use client";

import { applySignedInUser } from "@/lib/auth/session";
import { getProfile } from "@/lib/actions";
import { getSupabase, isCloudEnabled } from "@/lib/supabase/client";
import { Button, Card, Field, Input } from "@/components/ui";
import { APP_NAME } from "@/design/brand";
import { t, useT } from "@/lib/i18n";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

function friendlyAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("invalid login")) return t("auth.errLogin");
  if (lower.includes("already registered") || lower.includes("already been registered")) {
    return t("auth.errExists");
  }
  if (lower.includes("password")) return t("auth.errPassword");
  if (lower.includes("email")) return t("auth.errEmail");
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
  const tr = useT();

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
      setError(tr("auth.errCloud"));
      return;
    }
    const supabase = getSupabase();
    if (!supabase) {
      setError(tr("auth.errCloud"));
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
          setInfo(tr("auth.infoConfirm"));
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
        setError(friendlyAuthError(signError?.message ?? tr("auth.errSignIn")));
        return;
      }
      await applySignedInUser(data.user);
      await afterSession();
    } catch (err) {
      setError(err instanceof Error ? err.message : tr("auth.errGeneric"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[80dvh] max-w-md flex-col gap-6 pt-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ff-primary">{APP_NAME}</p>
        <h1 className="mt-2 font-display text-3xl font-semibold">
          {signup ? tr("auth.createTitle") : tr("auth.welcome")}
        </h1>
        <p className="mt-2 text-sm text-ff-dim">{tr("tagline")}</p>
      </header>

      <div className="grid grid-cols-2 gap-1 rounded-full bg-ff-muted p-1">
        <Link
          href="/login"
          className={`rounded-full px-2 py-2 text-center text-xs font-semibold ${
            !signup ? "bg-ff-primary text-[var(--ff-on-primary)]" : "text-ff-dim"
          }`}
        >
          {tr("auth.signIn")}
        </Link>
        <Link
          href="/signup"
          className={`rounded-full px-2 py-2 text-center text-xs font-semibold ${
            signup ? "bg-ff-primary text-[var(--ff-on-primary)]" : "text-ff-dim"
          }`}
        >
          {tr("auth.signUp")}
        </Link>
      </div>

      {!cloud && (
        <Card className="space-y-3">
          <p className="text-sm text-ff-dim">
            {tr("auth.cloudOff")}
          </p>
          <Button variant="ghost" className="w-full" type="button" onClick={() => router.replace("/")}>
            {tr("auth.continueDevice")}
          </Button>
        </Card>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        <Field label={tr("auth.email")}>
          <Input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={tr("auth.emailPh")}
          />
        </Field>
        <Field label={tr("auth.password")}>
          <Input
            type="password"
            autoComplete={signup ? "new-password" : "current-password"}
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={signup ? tr("auth.passwordNewPh") : tr("auth.passwordPh")}
          />
        </Field>

        {error && <p className="text-sm font-medium text-ff-danger">{error}</p>}
        {info && <p className="text-sm font-medium text-ff-primary">{info}</p>}

        <Button type="submit" className="w-full" disabled={busy || !cloud}>
          {busy ? (signup ? tr("auth.creating") : tr("auth.signingIn")) : signup ? tr("auth.create") : tr("auth.signIn")}
        </Button>
      </form>

      <p className="text-center text-sm text-ff-dim">
        {signup ? tr("auth.already") : tr("auth.newHere")}{" "}
        <Link href={signup ? "/login" : "/signup"} className="font-semibold text-ff-primary">
          {signup ? tr("auth.signIn") : tr("auth.createLink")}
        </Link>
      </p>
    </div>
  );
}
