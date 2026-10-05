"use client";

import { BmiCard } from "@/components/bmi/BmiCard";
import { APP_NAME } from "@/design/brand";
import { useActiveGoal } from "@/hooks/useActiveGoal";
import { addWater, removeWater } from "@/lib/actions";
import { db } from "@/lib/db";
import { addDays, todayKey } from "@/lib/dates";
import { greetingKey, intlLocale, MEAL_KEY, tipCategoryLabel, useT } from "@/lib/i18n";
import { suggestedMeal } from "@/lib/labels";
import { pickTips } from "@/lib/tips";
import { useLang } from "@/store/useLang";
import { Card } from "@/components/ui";
import { CalorieRing } from "@/components/dashboard/CalorieRing";
import { useUi } from "@/store/useUi";
import { useUserId } from "@/store/useAuth";
import { MEALS, type MealType } from "@/types";
import { useLiveQuery } from "dexie-react-hooks";
import { Droplets, Minus, Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo } from "react";

export function Dashboard() {
  const date = useUi((s) => s.selectedDate);
  const setDate = useUi((s) => s.setDate);
  const setMeal = useUi((s) => s.setMeal);
  const t = useT();
  const lang = useLang((s) => s.lang);
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
  const target = goal?.calorieTarget;
  const nextMeal = suggestedMeal();
  const week = weekContaining(date);

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
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-ff-dim">{formatDay(date, lang)}</p>
          <h1 className="font-display text-[1.65rem] font-semibold leading-tight">
            {t(greetingKey())}
            {profile?.displayName ? `, ${profile.displayName}` : ""}
          </h1>
          <p className="mt-1 text-xs text-ff-dim">
            {streak?.currentCount ? t("dash.streak", { n: streak.currentCount }) : t("dash.streakStart")}
          </p>
        </div>
        <img src="/icon.svg" alt={APP_NAME} className="h-10 w-10 shrink-0" />
      </header>

      <div className="grid grid-cols-7 gap-1">
        {week.map((day) => {
          const parts = dayParts(day, lang);
          const selected = day === date;
          const future = day > today;
          return (
            <button
              key={day}
              type="button"
              disabled={future}
              onClick={() => setDate(day)}
              className={`flex flex-col items-center rounded-full py-2 text-[11px] disabled:opacity-30 ${
                selected ? "bg-ff-primary text-[var(--ff-on-primary)]" : "text-ff-dim"
              }`}
            >
              <span>{parts.dow}</span>
              <span className={`mt-1 text-sm font-semibold ${selected ? "" : "text-ff-text"}`}>{parts.num}</span>
            </button>
          );
        })}
      </div>

      <Card className="px-3 py-4">
        {target == null ? (
          <p className="py-10 text-center text-sm text-ff-dim">{t("dash.loading")}</p>
        ) : (
          <CalorieRing eaten={calories} target={target} />
        )}
      </Card>

      {goal && (
        <div className="grid grid-cols-3 gap-2">
          <MacroRing label={t("dash.protein")} actual={protein} target={goal.proteinG} color="var(--ff-pro)" overLabel={t("dash.over")} leftLabel={t("dash.left")} />
          <MacroRing label={t("dash.carbs")} actual={carbs} target={goal.carbsG} color="var(--ff-carb)" overLabel={t("dash.over")} leftLabel={t("dash.left")} />
          <MacroRing label={t("dash.fat")} actual={fats} target={goal.fatG} color="var(--ff-fat)" overLabel={t("dash.over")} leftLabel={t("dash.left")} />
        </div>
      )}

      {heroTip && (
        <Link href="/tips" className="block rounded-ff border border-ff-primary/30 bg-ff-surface px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ff-primary">{tipCategoryLabel(heroTip.category, lang)}</p>
          <p className="mt-1 text-sm font-medium">{heroTip.title}</p>
        </Link>
      )}

      {profile && <BmiCard weightKg={profile.currentWeightKg} heightCm={profile.heightCm} compact />}

      <Card>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold">{t("dash.water")}</p>
            <p className="text-sm tabular-nums text-ff-dim">
              {Math.round(water)}/{goal?.waterMlTarget ?? 0} ml
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span
              aria-hidden
              className="grid h-10 w-10 place-items-center rounded-full bg-[color-mix(in_srgb,var(--ff-water)_18%,transparent)] text-[var(--ff-water)]"
            >
              <Droplets size={18} />
            </span>
            <button
              type="button"
              aria-label={t("dash.removeWater")}
              disabled={water <= 0}
              onClick={() => removeWater(date, 250)}
              className="grid h-10 w-10 place-items-center rounded-full bg-ff-muted text-ff-text disabled:opacity-30"
            >
              <Minus size={18} />
            </button>
            <button
              type="button"
              aria-label={t("dash.addWater")}
              onClick={() => addWater(date, 250)}
              className="grid h-10 w-10 place-items-center rounded-full bg-ff-primary text-[var(--ff-on-primary)]"
            >
              <Plus size={18} />
            </button>
          </div>
        </div>
      </Card>

      <Card className="space-y-3">
        <p className="font-semibold">{t("dash.meals")}</p>
        {MEALS.map((meal) => {
          const group = items?.filter((g) => g.log.mealType === meal) ?? [];
          const kcal = group.reduce((s, g) => s + g.items.reduce((a, i) => a + i.calories, 0), 0);
          const names = group.flatMap((g) => g.items.map((item) => item.name));
          const isNext = meal === nextMeal && date === today && group.length === 0;
          return (
            <Link
              key={meal}
              href={`/log?meal=${meal}`}
              onClick={() => setMeal(meal)}
              className="flex items-center justify-between gap-3 border-t border-ff-border pt-3 first:border-0 first:pt-0"
            >
              <div className="min-w-0">
                <p className="font-medium">
                  {t(MEAL_KEY[meal])}
                  {isNext && <span className="ml-2 text-xs font-semibold text-ff-primary">{t("dash.now")}</span>}
                </p>
                <p className="truncate text-xs text-ff-dim">
                  {names.length > 0
                    ? names.join(", ")
                    : t("dash.addMeal", { meal: t(MEAL_KEY[meal]).toLocaleLowerCase(intlLocale(lang)) })}
                </p>
              </div>
              <span className="shrink-0 text-sm text-ff-dim">{Math.round(kcal)} kcal</span>
            </Link>
          );
        })}
      </Card>
    </div>
  );
}

function MacroRing({
  label,
  actual,
  target,
  color,
  overLabel,
  leftLabel,
}: {
  label: string;
  actual: number;
  target: number;
  color: string;
  overLabel: string;
  leftLabel: string;
}) {
  const left = Math.round(target - actual);
  const over = left < 0;
  const pct = target > 0 ? Math.min(1, actual / target) : 0;
  const radius = 15;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="flex min-w-0 flex-col items-center rounded-ff border border-ff-border bg-ff-surface px-1.5 pb-3 pt-2.5 text-center">
      <svg viewBox="0 0 44 44" className="h-12 w-12 -rotate-90" aria-hidden>
        <circle cx="22" cy="22" r={radius} stroke={color} strokeOpacity={0.72} strokeWidth="5.5" fill="none" />
        {pct > 0 && (
          <circle
            cx="22"
            cy="22"
            r={radius}
            stroke={color}
            strokeWidth="5.5"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${circumference * pct} ${circumference}`}
          />
        )}
      </svg>
      <p className="mt-2 text-lg font-semibold leading-none tabular-nums">{Math.abs(left)}g</p>
      <p className="mt-1 text-xs font-medium leading-tight">{label}</p>
      <p className="text-[11px] leading-tight text-ff-dim">{over ? overLabel : leftLabel}</p>
    </div>
  );
}

function weekContaining(iso: string): string[] {
  const [y, m, d] = iso.split("-").map(Number);
  const mondayOffset = (new Date(y, m - 1, d).getDay() + 6) % 7;
  const start = addDays(iso, -mondayOffset);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

function dayParts(iso: string, lang: "en" | "sv"): { dow: string; num: number } {
  const [y, m, d] = iso.split("-").map(Number);
  return {
    dow: new Date(y, m - 1, d).toLocaleDateString(intlLocale(lang), { weekday: "short" }),
    num: d,
  };
}

function formatDay(iso: string, lang: "en" | "sv"): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(intlLocale(lang), {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
