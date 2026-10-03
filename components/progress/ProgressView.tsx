"use client";

import { addWeighIn } from "@/lib/actions";
import { computeBmi } from "@/lib/bmi";
import { db } from "@/lib/db";
import { addDays, todayKey } from "@/lib/dates";
import { Button, Card, Field, Input } from "@/components/ui";
import { useUi } from "@/store/useUi";
import { useUserId } from "@/store/useAuth";
import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useState } from "react";

export function ProgressView() {
  const showToast = useUi((s) => s.showToast);
  const [weight, setWeight] = useState(78);
  const userId = useUserId();
  const profile = useLiveQuery(() => db.profiles.get(userId), [userId]);
  const progress = useLiveQuery(
    () =>
      db.dailyProgress
        .where("userId")
        .equals(userId)
        .sortBy("localDate")
        .then((rows) => rows.slice(-7).reverse()),
    [userId],
  );
  const streaks = useLiveQuery(() => db.streaks.where("userId").equals(userId).toArray(), [userId]);
  const unlocks = useLiveQuery(() => db.userAchievements.where("userId").equals(userId).toArray(), [userId]);
  const catalog = useLiveQuery(() => db.achievements.toArray());
  const weighIns = useLiveQuery(
    () =>
      db.bodyMetrics
        .where("userId")
        .equals(userId)
        .sortBy("localDate")
        .then((rows) => rows.slice(-6).reverse()),
    [userId],
  );
  const week = lastSeven();
  const byDate = new Map((progress ?? []).map((p) => [p.localDate, p]));
  const heightCm = profile?.heightCm ?? 0;
  const previewBmi = heightCm ? computeBmi(weight, heightCm) : 0;

  useEffect(() => {
    if (profile?.currentWeightKg) setWeight(profile.currentWeightKg);
  }, [profile?.currentWeightKg]);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="font-display text-2xl font-semibold">Progress</h1>
        <p className="text-sm text-ff-dim">Streaks, weigh-ins, and badges.</p>
        <a href="/tips" className="mt-2 inline-block text-sm font-semibold text-ff-primary">
          Need a nudge? Open coach tips
        </a>
      </header>

      <Card>
        <p className="mb-3 text-sm font-semibold">Last 7 days</p>
        <div className="grid grid-cols-7 gap-2">
          {week.map((day) => {
            const row = byDate.get(day);
            const height = row ? Math.min(100, (row.calories / Math.max(row.calorieTarget, 1)) * 100) : 0;
            return (
              <div key={day} className="text-center">
                <div className="flex h-24 items-end rounded-md bg-ff-muted p-1">
                  <div
                    className="w-full rounded-sm bg-ff-primary"
                    style={{ height: `${height}%` }}
                  />
                </div>
                <p className="mt-1 text-[10px] text-ff-dim">{day.slice(8)}</p>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="space-y-2">
        <p className="font-semibold">Streaks</p>
        {(streaks ?? []).map((s) => (
          <div key={s.kind} className="flex items-center justify-between text-sm">
            <span className="capitalize text-ff-dim">{s.kind.replaceAll("_", " ")}</span>
            <span className="font-semibold">
              {s.currentCount} <span className="text-ff-dim">best {s.longestCount}</span>
            </span>
          </div>
        ))}
      </Card>

      <Card className="space-y-3">
        <p className="font-semibold">Weekly weigh-in</p>
        <Field label="Weight (kg)">
          <Input type="number" step="0.1" value={weight} onChange={(e) => setWeight(Number(e.target.value))} />
        </Field>
        {heightCm > 0 && (
          <p className="text-sm text-ff-dim">
            BMI at this weight: <span className="font-semibold text-ff-text">{previewBmi}</span>
          </p>
        )}
        <Button
          className="w-full"
          onClick={async () => {
            await addWeighIn(todayKey(), weight);
            showToast(`Weigh-in saved · BMI ${computeBmi(weight, heightCm)} · +25 XP`);
          }}
        >
          Log weigh-in
        </Button>
        <ul className="space-y-1 text-sm text-ff-dim">
          {(weighIns ?? []).map((w) => (
            <li key={w.id} className="flex justify-between">
              <span>{w.localDate}</span>
              <span>
                {w.weightKg} kg
                {heightCm > 0 ? ` · BMI ${computeBmi(w.weightKg, heightCm)}` : ""}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="space-y-2">
        <p className="font-semibold">Achievements</p>
        {(catalog ?? []).map((a) => {
          const got = unlocks?.some((u) => u.achievementId === a.id);
          return (
            <div
              key={a.id}
              className={`rounded-ff border px-3 py-2 ${got ? "border-ff-primary bg-ff-muted" : "border-ff-border opacity-60"}`}
            >
              <div className="flex items-center justify-between">
                <p className="font-medium">{a.title}</p>
                <p className="text-xs uppercase text-ff-dim">{a.tier}</p>
              </div>
              <p className="text-xs text-ff-dim">{a.description}</p>
            </div>
          );
        })}
      </Card>
    </div>
  );
}

function lastSeven(): string[] {
  const end = todayKey();
  return Array.from({ length: 7 }, (_, i) => addDays(end, i - 6));
}
