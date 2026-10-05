"use client";

import { BmiCard } from "@/components/bmi/BmiCard";
import { useActiveGoal } from "@/hooks/useActiveGoal";
import { db } from "@/lib/db";
import { ACTIVITY_KEY, GOAL_KEY, TIER_KEY, useT } from "@/lib/i18n";
import { isCloudEnabled } from "@/lib/supabase/client";
import { xpIntoLevel } from "@/lib/level";
import { Card } from "@/components/ui";
import { APP_NAME } from "@/design/brand";
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
  const t = useT();

  return (
    <div className="space-y-4">
      <header>
        <img src="/icon.svg" alt="" className="mb-3 h-12 w-12" />
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ff-primary">{APP_NAME}</p>
        <h1 className="font-display text-2xl font-semibold">{profile?.displayName}</h1>
        <p className="text-sm text-ff-dim">{email ?? t("tagline")}</p>
      </header>

      <Card>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase text-ff-dim">
              {profile ? t("profile.tierLine", { tier: t(TIER_KEY[profile.tier]) }) : ""}
            </p>
            <p className="font-display text-3xl font-semibold">{t("profile.level", { n: profile?.level ?? "" })}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-ff-xp">{t("profile.pts", { n: profile?.pointsBalance ?? "" })}</p>
            <p className="text-xs text-ff-dim">{t("profile.redeem")}</p>
          </div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-ff-muted">
          <div className="h-full bg-ff-xp" style={{ width: `${xp.ratio * 100}%` }} />
        </div>
      </Card>

      <Card className="space-y-1 text-sm">
        <Row label={t("profile.goal")} value={goal ? t(GOAL_KEY[goal.goalType]) : "—"} />
        <Row label={t("profile.activity")} value={profile ? t(ACTIVITY_KEY[profile.activityLevel]) : "—"} />
        <Row label={t("profile.target")} value={goal ? `${goal.calorieTarget} kcal` : "—"} />
        <Row label={t("profile.tdee")} value={goal ? `${goal.tdeeKcal} kcal` : "—"} />
        <Row label={t("profile.macros")} value={goal ? `${goal.proteinG} / ${goal.carbsG} / ${goal.fatG} g` : "—"} />
        <Row label={t("profile.weight")} value={profile ? `${profile.currentWeightKg} kg` : "—"} />
        <Row label={t("profile.height")} value={profile ? `${profile.heightCm} cm` : "—"} />
        <Row label={t("profile.account")} value={email ?? (cloud ? t("profile.signedIn") : t("profile.localOnly"))} />
        <Row
          label={t("profile.cloud")}
          value={cloud ? (signedIn ? t("profile.cloudOn") : t("profile.cloudSignIn")) : t("profile.cloudOff")}
        />
      </Card>

      <Link
        href="/settings"
        className="flex min-h-11 items-center justify-between rounded-ff border border-ff-border bg-ff-surface px-4 py-3"
      >
        <span>
          <span className="block font-semibold">{t("profile.settings")}</span>
          <span className="text-xs text-ff-dim">{t("profile.settingsHint")}</span>
        </span>
        <ChevronRight size={18} className="text-ff-dim" />
      </Link>

      <Link
        href="/tips"
        className="flex min-h-11 items-center justify-center rounded-full bg-ff-muted text-sm font-semibold"
      >
        {t("profile.tips")}
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
