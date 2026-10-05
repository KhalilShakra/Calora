"use client";

import { APP_NAME } from "@/design/brand";
import { resetLocalData, setTheme, updateDisplayName } from "@/lib/actions";
import { signOut } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { ACTIVITY_KEY, GOAL_KEY, useT } from "@/lib/i18n";
import { useLang } from "@/store/useLang";
import { isCloudEnabled } from "@/lib/supabase/client";
import { cmToFtIn, kgToLb } from "@/lib/units";
import { Button, Card, Field, Input, Segmented } from "@/components/ui";
import { useActiveGoal } from "@/hooks/useActiveGoal";
import { useAuth, useUserId } from "@/store/useAuth";
import { useUi } from "@/store/useUi";
import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function SettingsView() {
  const router = useRouter();
  const userId = useUserId();
  const email = useAuth((s) => s.email);
  const signedIn = useAuth((s) => s.signedIn);
  const cloud = isCloudEnabled();
  const showToast = useUi((s) => s.showToast);
  const t = useT();
  const lang = useLang((s) => s.lang);
  const setLang = useLang((s) => s.setLang);
  const profile = useLiveQuery(() => db.profiles.get(userId), [userId]);
  const goal = useActiveGoal();
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [savingName, setSavingName] = useState(false);

  useEffect(() => {
    if (profile?.displayName) setName(profile.displayName);
  }, [profile?.displayName]);

  const units = profile?.units ?? "metric";
  const weight =
    profile == null
      ? "—"
      : units === "imperial"
        ? `${kgToLb(profile.currentWeightKg)} lb`
        : `${profile.currentWeightKg} kg`;
  const height =
    profile == null
      ? "—"
      : units === "imperial"
        ? `${cmToFtIn(profile.heightCm).ft} ft ${cmToFtIn(profile.heightCm).inch} in`
        : `${profile.heightCm} cm`;

  async function saveName() {
    const next = name.trim();
    if (!next) {
      setNameError(t("settings.errName"));
      return;
    }
    setSavingName(true);
    setNameError(null);
    try {
      await updateDisplayName(next);
      showToast(t("settings.toastName"));
    } finally {
      setSavingName(false);
    }
  }

  return (
    <div className="space-y-4">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ff-primary">{APP_NAME}</p>
        <h1 className="font-display text-2xl font-semibold">{t("settings.title")}</h1>
        <p className="text-sm text-ff-dim">{t("settings.subtitle")}</p>
      </header>

      <Card className="space-y-3">
        <p className="font-semibold">{t("settings.account")}</p>
        {signedIn ? (
          <>
            <p className="text-sm">{email ?? t("profile.signedIn")}</p>
            <Button
              variant="ghost"
              className="w-full"
              onClick={async () => {
                await signOut();
                router.replace("/login");
              }}
            >
              {t("settings.signOut")}
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm text-ff-dim">
              {cloud ? t("settings.signedOut") : t("settings.cloudOff", { app: APP_NAME })}
            </p>
            <Button className="w-full" onClick={() => router.push("/signup")}>
              {t("settings.create")}
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => router.push("/login")}>
              {t("settings.signIn")}
            </Button>
          </>
        )}
      </Card>

      <Card className="space-y-3">
        <p className="font-semibold">{t("settings.profile")}</p>
        <Field label={t("settings.displayName")}>
          <Input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setNameError(null);
            }}
          />
        </Field>
        {nameError && <p className="text-xs font-medium text-ff-danger">{nameError}</p>}
        <Button variant="soft" className="w-full" disabled={savingName || !profile} onClick={() => void saveName()}>
          {savingName ? t("settings.saving") : t("settings.saveName")}
        </Button>
        <div className="space-y-1 text-sm">
          <Row
            label={t("settings.goal")}
            value={
              goal
                ? t("settings.goalLine", { goal: t(GOAL_KEY[goal.goalType]), kcal: goal.calorieTarget })
                : "—"
            }
          />
          <Row label={t("settings.training")} value={profile ? t(ACTIVITY_KEY[profile.activityLevel]) : "—"} />
          <Row label={t("settings.weight")} value={weight} />
          <Row label={t("settings.height")} value={height} />
          <Row label={t("settings.units")} value={units === "imperial" ? t("settings.imperial") : t("settings.metric")} />
        </div>
      </Card>

      <Card className="space-y-3">
        <p className="font-semibold">{t("settings.theme")}</p>
        <Segmented
          value={profile?.themeId ?? "dark"}
          onChange={(theme) => void setTheme(theme)}
          options={[
            { value: "dark", label: t("settings.night") },
            { value: "light", label: t("settings.light") },
          ]}
        />
      </Card>

      <Card className="space-y-3">
        <p className="font-semibold">{t("settings.language")}</p>
        <Segmented
          value={lang}
          onChange={setLang}
          options={[
            { value: "en", label: "English" },
            { value: "sv", label: "Svenska" },
          ]}
        />
      </Card>

      <Link
        href="/tips"
        className="flex min-h-11 items-center justify-center rounded-full bg-ff-muted text-sm font-semibold"
      >
        {t("settings.tips")}
      </Link>

      <Button
        variant="danger"
        className="w-full"
        onClick={async () => {
          if (
            !confirm(t("settings.resetConfirm", { app: APP_NAME }))
          ) {
            return;
          }
          await resetLocalData();
          router.replace("/onboarding");
        }}
      >
        {t("settings.reset")}
      </Button>
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
