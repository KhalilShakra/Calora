"use client";

import { BmiCard } from "@/components/bmi/BmiCard";
import { useActiveGoal } from "@/hooks/useActiveGoal";
import { db } from "@/lib/db";
import { ACTIVITY_LABEL, GOAL_LABEL } from "@/lib/labels";
import { isCloudEnabled } from "@/lib/supabase/client";
import { xpIntoLevel } from "@/lib/level";
import { Card } from "@/components/ui";
import { APP_NAME, APP_TAGLINE } from "@/design/brand";
import { useAuth, useUserId } from "@/store/useAuth";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

export function ProfileView() {
  const userId = useUserId();
  const email = useAuth((s) => s.email);
  const signedIn = useAuth((s) => s.signedIn);
  const cloud = isCloudEnabled();
  const profile = useLiveQuery(() => db.profiles.get(userId), [userId]);
  const goal = useActiveGoal();
  const xp = profile ? xpIntoLevel(profile.xpTotal) : { current: 0, needed: 500, ratio: 0 };

  return (
    <div className="space-y-4">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ff-primary">{APP_NAME}</p>
        <h1 className="font-display text-2xl font-semibold">{profile?.displayName}</h1>
        <p className="text-sm text-ff-dim">{email ?? APP_TAGLINE}</p>
      </header>

      <Card>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase text-ff-dim">{profile?.tier} tier</p>
            <p className="font-display text-3xl font-semibold">Level {profile?.level}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-ff-xp">{profile?.pointsBalance} pts</p>
            <p className="text-xs text-ff-dim">redeemable later</p>
          </div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-ff-muted">
          <div className="h-full bg-ff-xp" style={{ width: `${xp.ratio * 100}%` }} />
        </div>
      </Card>

      <Card className="space-y-1 text-sm">
        <Row label="Goal" value={goal ? GOAL_LABEL[goal.goalType] : "—"} />
        <Row label="Activity" value={profile ? ACTIVITY_LABEL[profile.activityLevel] : "—"} />
        <Row label="Target" value={goal ? `${goal.calorieTarget} kcal` : "—"} />
        <Row label="TDEE" value={goal ? `${goal.tdeeKcal} kcal` : "—"} />
        <Row label="Macros" value={goal ? `${goal.proteinG} / ${goal.carbsG} / ${goal.fatG} g` : "—"} />
        <Row label="Weight" value={profile ? `${profile.currentWeightKg} kg` : "—"} />
        <Row label="Height" value={profile ? `${profile.heightCm} cm` : "—"} />
        <Row label="Account" value={email ?? (cloud ? "Signed in" : "Local only")} />
        <Row label="Cloud sync" value={cloud ? (signedIn ? "On" : "Sign in to sync") : "Offline vault"} />
      </Card>

      <Link
        href="/settings"
        className="flex min-h-11 items-center justify-between rounded-ff border border-ff-border bg-ff-surface px-4 py-3"
      >
        <span>
          <span className="block font-semibold">Settings</span>
          <span className="text-xs text-ff-dim">Account, theme, units, reset</span>
        </span>
        <ChevronRight size={18} className="text-ff-dim" />
      </Link>

      <Link
        href="/tips"
        className="flex min-h-11 items-center justify-center rounded-full bg-ff-muted text-sm font-semibold"
      >
        Open coach tips
      </Link>

      {profile && (
        <BmiCard weightKg={profile.currentWeightKg} heightCm={profile.heightCm} />
      )}

    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-ff-dim">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
