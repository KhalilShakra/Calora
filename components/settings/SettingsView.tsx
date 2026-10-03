"use client";

import { resetLocalData, setTheme, updateDisplayName } from "@/lib/actions";
import { signOut } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { ACTIVITY_LABEL, GOAL_LABEL } from "@/lib/labels";
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
      setNameError("Enter a name");
      return;
    }
    setSavingName(true);
    setNameError(null);
    try {
      await updateDisplayName(next);
      showToast("Name saved");
    } finally {
      setSavingName(false);
    }
  }

  return (
    <div className="space-y-4">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ff-primary">ForgeFuel</p>
        <h1 className="font-display text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-ff-dim">Account, profile, and how the app looks.</p>
      </header>

      <Card className="space-y-3">
        <p className="font-semibold">Account</p>
        {signedIn ? (
          <>
            <p className="text-sm">{email ?? "Signed in"}</p>
            <Button
              variant="ghost"
              className="w-full"
              onClick={async () => {
                await signOut();
                router.replace("/login");
              }}
            >
              Sign out
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm text-ff-dim">
              {cloud
                ? "You are not signed in. Create an account or sign in to sync this device."
                : "Cloud accounts are off until Supabase keys are added. You can keep using ForgeFuel on this device. Register and sign in stay disabled until then."}
            </p>
            <Button className="w-full" onClick={() => router.push("/signup")}>
              Create account
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => router.push("/login")}>
              Sign in
            </Button>
          </>
        )}
      </Card>

      <Card className="space-y-3">
        <p className="font-semibold">Profile</p>
        <Field label="Display name">
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
          {savingName ? "Saving…" : "Save name"}
        </Button>
        <div className="space-y-1 text-sm">
          <Row label="Goal" value={goal ? `${GOAL_LABEL[goal.goalType]} · ${goal.calorieTarget} kcal` : "—"} />
          <Row label="Training" value={profile ? ACTIVITY_LABEL[profile.activityLevel] : "—"} />
          <Row label="Weight" value={weight} />
          <Row label="Height" value={height} />
          <Row label="Units" value={units === "imperial" ? "Imperial" : "Metric"} />
        </div>
      </Card>

      <Card className="space-y-3">
        <p className="font-semibold">Theme</p>
        <Segmented
          value={profile?.themeId ?? "dark"}
          onChange={(theme) => void setTheme(theme)}
          options={[
            { value: "dark", label: "Ember" },
            { value: "light", label: "Daylight" },
          ]}
        />
      </Card>

      <Link
        href="/tips"
        className="flex min-h-11 items-center justify-center rounded-full bg-ff-muted text-sm font-semibold"
      >
        Open coach tips
      </Link>

      <Button
        variant="danger"
        className="w-full"
        onClick={async () => {
          if (
            !confirm(
              "Erase local ForgeFuel data on this device? Signed-in cloud data may restore on the next sync.",
            )
          ) {
            return;
          }
          await resetLocalData();
          router.replace("/onboarding");
        }}
      >
        Reset local data
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
