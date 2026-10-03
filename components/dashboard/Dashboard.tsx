"use client";

import { BmiCard } from "@/components/bmi/BmiCard";
import { RemainingChips, TipCard } from "@/components/tips/TipCard";
import { useActiveGoal } from "@/hooks/useActiveGoal";
import { addWater } from "@/lib/actions";
import { db } from "@/lib/db";
import { addDays, formatHumanDate, todayKey } from "@/lib/dates";
import { greetingForHour, MEAL_LABEL, suggestedMeal } from "@/lib/labels";
import { xpIntoLevel } from "@/lib/level";
import { pickTips } from "@/lib/tips";
import { Card } from "@/components/ui";
import { CalorieRing } from "@/components/dashboard/CalorieRing";
import { MacroBar } from "@/components/dashboard/MacroBar";
import { useUi } from "@/store/useUi";
import { useUserId } from "@/store/useAuth";
import { MEALS, type MealType } from "@/types";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronLeft, ChevronRight, Droplets, Flame, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, type ReactNode } from "react";

export function Dashboard() {
  const date = useUi((s) => s.selectedDate);
  const setDate = useUi((s) => s.setDate);
  const setMeal = useUi((s) => s.setMeal);
  const today = todayKey();
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
    return headers.map((h, i) => ({ log: h, items: rows[i] }));
  }, [userId, date]);
  const waters = useLiveQuery(
    () => db.waterLogs.where("[userId+localDate]").equals([userId, date]).toArray(),
    [userId, date],
  );
  const streak = useLiveQuery(() => db.streaks.get([userId, "daily_log"]), [userId]);

  useEffect(() => {
    const sync = () => {
      const now = todayKey();
      if (useUi.getState().selectedDate > now) useUi.getState().setDate(now);
    };
    sync();
    const id = window.setInterval(sync, 60_000);
    return () => window.clearInterval(id);
  }, []);

  const flatItems = items?.flatMap((g) => g.items) ?? [];
  const calories = flatItems.reduce((s, i) => s + i.calories, 0);
  const protein = flatItems.reduce((s, i) => s + i.proteinG, 0);
  const carbs = flatItems.reduce((s, i) => s + i.carbsG, 0);
  const fats = flatItems.reduce((s, i) => s + i.fatG, 0);
  const water = waters?.reduce((s, w) => s + w.amountMl, 0) ?? 0;
  const xp = profile ? xpIntoLevel(profile.xpTotal) : { current: 0, needed: 500, ratio: 0 };
  const target = goal?.calorieTarget;
  const nextMeal = suggestedMeal();

  const heroTip = useMemo(() => {
    if (!profile || !goal) return null;
    return pickTips({
      date,
      hour: new Date().getHours(),
      goalType: goal.goalType,
      calorieTarget: goal.calorieTarget,
      proteinTarget: goal.proteinG,
      carbsTarget: goal.carbsG,
      fatTarget: goal.fatG,
      waterTargetMl: goal.waterMlTarget,
      calories,
      proteinG: protein,
      carbsG: carbs,
      fatG: fats,
      waterMl: water,
      mealsLogged: logs?.length ?? 0,
      streak: streak?.currentCount ?? 0,
      weightKg: profile.currentWeightKg,
      heightCm: profile.heightCm,
      loggedMeals: [...new Set((logs ?? []).map((l) => l.mealType as MealType))],
    })[0];
  }, [profile, goal, date, calories, protein, carbs, fats, water, logs, streak]);

  return (
    <div className="space-y-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-ff-dim">{greetingForHour()}</p>
          <h1 className="font-display text-2xl font-semibold">{profile?.displayName ?? "Forger"}</h1>
        </div>
        <div className="rounded-full border border-ff-border bg-ff-surface px-3 py-1 text-right">
          <p className="text-[11px] uppercase text-ff-dim">{profile?.tier}</p>
          <p className="text-sm font-semibold">Lv {profile?.level ?? 1}</p>
        </div>
      </header>

      <div className="flex items-center justify-between">
        <button type="button" onClick={() => setDate(addDays(date, -1))} aria-label="Previous day">
          <ChevronLeft />
        </button>
        <button
          type="button"
          onClick={() => setDate(today)}
          className="text-sm font-medium"
        >
          {date === today ? formatHumanDate(date) : `${formatHumanDate(date)} · jump to today`}
        </button>
        <button
          type="button"
          onClick={() => setDate(addDays(date, 1))}
          aria-label="Next day"
          disabled={date >= today}
          className="disabled:opacity-30"
        >
          <ChevronRight />
        </button>
      </div>

      <Card className="text-center">
        {target == null ? (
          <p className="py-10 text-sm text-ff-dim">Loading your targets…</p>
        ) : (
          <CalorieRing eaten={calories} target={target} />
        )}
        <div className="mt-4 grid grid-cols-3 gap-3 text-center">
          <Mini stat={`${streak?.currentCount ?? 0}d`} label="Streak" icon={<Flame size={14} className="text-ff-streak" />} />
          <Mini stat={`${profile?.pointsBalance ?? 0}`} label="Points" icon={<Sparkles size={14} className="text-ff-xp" />} />
          <Mini stat={`${logs?.length ?? 0}`} label="Logs" icon={<Flame size={14} className="text-ff-primary" />} />
        </div>
        <div className="mt-4">
          <div className="mb-1 flex justify-between text-xs text-ff-dim">
            <span>XP {xp.current}/{xp.needed}</span>
            <span>{profile?.xpTotal ?? 0} total</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-ff-muted">
            <div className="h-full bg-ff-xp" style={{ width: `${xp.ratio * 100}%` }} />
          </div>
        </div>
      </Card>

      {goal && (
        <RemainingChips
          proteinLeft={Math.round(goal.proteinG - protein)}
          kcalLeft={Math.round(goal.calorieTarget - calories)}
          waterLeft={goal.waterMlTarget - water}
        />
      )}

      {heroTip && <TipCard tip={heroTip} featured />}
      <Link href="/tips" className="block text-center text-sm font-semibold text-ff-primary">
        More coach tips
      </Link>

      {profile && <BmiCard weightKg={profile.currentWeightKg} heightCm={profile.heightCm} compact />}

      <Card className="space-y-3">
        <MacroBar label="Protein" actual={protein} target={goal?.proteinG ?? 0} color="var(--ff-pro)" />
        <MacroBar label="Carbs" actual={carbs} target={goal?.carbsG ?? 0} color="var(--ff-carb)" />
        <MacroBar label="Fats" actual={fats} target={goal?.fatG ?? 0} color="var(--ff-fat)" />
      </Card>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold">
            <Droplets size={18} className="text-ff-water" />
            Water
          </div>
          <span className="text-sm text-ff-dim">
            {water} / {goal?.waterMlTarget ?? 0} ml
          </span>
        </div>
        <div className="flex gap-2">
          {[250, 500].map((ml) => (
            <button
              key={ml}
              type="button"
              onClick={() => addWater(date, ml)}
              className="flex-1 rounded-full bg-ff-muted py-2 text-sm font-semibold text-ff-water"
            >
              +{ml} ml
            </button>
          ))}
        </div>
      </Card>

      <div className="space-y-3">
        {MEALS.map((meal) => {
          const group = items?.filter((g) => g.log.mealType === meal) ?? [];
          const kcal = group.reduce((s, g) => s + g.items.reduce((a, i) => a + i.calories, 0), 0);
          const isNext = meal === nextMeal && date === today;
          return (
            <Card key={meal} className={isNext && group.length === 0 ? "border-ff-primary/40" : undefined}>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="font-display">
                  {MEAL_LABEL[meal]}
                  {isNext && <span className="ml-2 text-xs font-medium text-ff-primary">now</span>}
                </h2>
                <span className="text-sm text-ff-dim">{Math.round(kcal)} kcal</span>
              </div>
              {group.length === 0 ? (
                <Link
                  href="/log"
                  onClick={() => setMeal(meal)}
                  className="text-sm font-medium text-ff-primary"
                >
                  Add {MEAL_LABEL[meal].toLowerCase()}
                </Link>
              ) : (
                <ul className="space-y-1 text-sm">
                  {group.flatMap((g) =>
                    g.items.map((item) => (
                      <li key={item.id} className="flex justify-between">
                        <span>{item.name}</span>
                        <span className="text-ff-dim">{Math.round(item.calories)}</span>
                      </li>
                    )),
                  )}
                </ul>
              )}
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Link
          href="/log"
          onClick={() => setMeal(nextMeal)}
          className="flex min-h-12 items-center justify-center rounded-full bg-ff-muted font-semibold"
        >
          Quick add
        </Link>
        <Link
          href="/scan"
          className="flex min-h-12 items-center justify-center rounded-full bg-ff-primary font-semibold text-slate-950 shadow-glow"
        >
          Scan a meal
        </Link>
      </div>
    </div>
  );
}

function Mini({
  stat,
  label,
  icon,
}: {
  stat: string;
  label: string;
  icon: ReactNode;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-center gap-1">{icon}</div>
      <p className="font-display text-lg font-semibold">{stat}</p>
      <p className="text-[11px] uppercase tracking-wide text-ff-dim">{label}</p>
    </div>
  );
}
