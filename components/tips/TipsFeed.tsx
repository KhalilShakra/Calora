"use client";

import { RemainingChips, TipCard, TipsDisclaimer } from "@/components/tips/TipCard";
import { useActiveGoal } from "@/hooks/useActiveGoal";
import { db } from "@/lib/db";
import { pickTips } from "@/lib/tips";
import { useUi } from "@/store/useUi";
import { useUserId } from "@/store/useAuth";
import { type MealType } from "@/types";
import { useLiveQuery } from "dexie-react-hooks";
import { useMemo } from "react";

export function TipsFeed({ limit }: { limit?: number }) {
  const date = useUi((s) => s.selectedDate);
  const userId = useUserId();
  const profile = useLiveQuery(() => db.profiles.get(userId), [userId]);
  const goal = useActiveGoal();
  const logs = useLiveQuery(
    () => db.foodLogs.where("[userId+localDate]").equals([userId, date]).toArray(),
    [userId, date],
  );
  const items = useLiveQuery(async () => {
    const headers = await db.foodLogs.where("[userId+localDate]").equals([userId, date]).toArray();
    const rows = await Promise.all(
      headers.map((h) => db.foodLogItems.where("foodLogId").equals(h.id).toArray()),
    );
    return rows.flat();
  }, [userId, date]);
  const waters = useLiveQuery(
    () => db.waterLogs.where("[userId+localDate]").equals([userId, date]).toArray(),
    [userId, date],
  );
  const streak = useLiveQuery(() => db.streaks.get([userId, "daily_log"]), [userId]);

  const tips = useMemo(() => {
    if (!profile || !goal) return [];
    return pickTips({
      date,
      hour: new Date().getHours(),
      goalType: goal.goalType,
      calorieTarget: goal.calorieTarget,
      proteinTarget: goal.proteinG,
      carbsTarget: goal.carbsG,
      fatTarget: goal.fatG,
      waterTargetMl: goal.waterMlTarget,
      calories: items?.reduce((s, i) => s + i.calories, 0) ?? 0,
      proteinG: items?.reduce((s, i) => s + i.proteinG, 0) ?? 0,
      carbsG: items?.reduce((s, i) => s + i.carbsG, 0) ?? 0,
      fatG: items?.reduce((s, i) => s + i.fatG, 0) ?? 0,
      waterMl: waters?.reduce((s, w) => s + w.amountMl, 0) ?? 0,
      mealsLogged: logs?.length ?? 0,
      streak: streak?.currentCount ?? 0,
      weightKg: profile.currentWeightKg,
      heightCm: profile.heightCm,
      loggedMeals: [...new Set((logs ?? []).map((l) => l.mealType as MealType))],
    });
  }, [profile, goal, date, items, waters, logs, streak]);

  const shown = limit ? tips.slice(0, limit) : tips;
  const proteinLeft = (goal?.proteinG ?? 0) - (items?.reduce((s, i) => s + i.proteinG, 0) ?? 0);
  const kcalLeft = (goal?.calorieTarget ?? 0) - (items?.reduce((s, i) => s + i.calories, 0) ?? 0);
  const waterLeft = (goal?.waterMlTarget ?? 0) - (waters?.reduce((s, w) => s + w.amountMl, 0) ?? 0);

  if (!profile || !goal) {
    return <p className="text-sm text-ff-dim">Your coach unlocks after onboarding.</p>;
  }

  return (
    <div className="space-y-3">
      <RemainingChips
        proteinLeft={Math.round(proteinLeft)}
        kcalLeft={Math.round(kcalLeft)}
        waterLeft={waterLeft}
      />
      {shown.map((tip, index) => (
        <TipCard key={tip.id} tip={tip} featured={index === 0} />
      ))}
      <TipsDisclaimer />
    </div>
  );
}
