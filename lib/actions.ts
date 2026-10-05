import { ACHIEVEMENT_SEED } from "@/lib/achievements";
import { newId, nowIso } from "@/lib/dates";
import { db } from "@/lib/db";
import {
  applyLedger,
  evaluateDailyRewards,
  hitFlags,
  qualifyStreak,
  unlockAchievement,
} from "@/lib/rewards";
import { computeTdeePlan, weeklyRateKgFor, type MacroFocus, type Pace } from "@/lib/tdee";
import type {
  ActivityLevel,
  CustomFood,
  DailyProgress,
  FoodLog,
  FoodLogItem,
  Goal,
  GoalType,
  LogSource,
  MealType,
  Micronutrients,
  Profile,
  Sex,
  StreakKind,
  UnitSystem,
} from "@/types";
import { clearOnboardingFinished, markOnboardingFinished, readOnboardingFinished } from "@/lib/onboardingGate";
import { t } from "@/lib/i18n";
import { getUserId } from "@/store/useAuth";
import { scheduleSync } from "@/lib/sync/cloud";

const STREAK_KINDS: StreakKind[] = [
  "daily_log",
  "calorie_target",
  "macro_target",
  "water",
  "weigh_in",
];

export async function seedLocalCatalog(): Promise<void> {
  const count = await db.achievements.count();
  if (count === 0) {
    await db.achievements.bulkAdd(ACHIEVEMENT_SEED);
  }
}

export async function getProfile(): Promise<Profile | undefined> {
  return db.profiles.get(getUserId());
}

/** Current account finished onboarding, or this device already has a finished plan (sign-out keeps it). */
export async function onboardingRouteState(): Promise<{ currentDone: boolean; returning: boolean }> {
  const profile = await getProfile();
  const currentDone = Boolean(profile?.onboardingCompletedAt);
  if (currentDone) {
    markOnboardingFinished();
    return { currentDone: true, returning: true };
  }
  const other = await db.profiles.filter((row) => Boolean(row.onboardingCompletedAt)).first();
  if (other) markOnboardingFinished();
  return { currentDone: false, returning: readOnboardingFinished() || Boolean(other) };
}

export async function getActiveGoal(): Promise<Goal | undefined> {
  const userId = getUserId();
  return db.goals.filter((g) => g.userId === userId && g.isActive).first();
}

export interface OnboardingInput {
  displayName: string;
  dateOfBirth: string;
  sex: Sex;
  heightCm: number;
  currentWeightKg: number;
  activityLevel: ActivityLevel;
  goalType: GoalType;
  targetWeightKg: number;
  units: UnitSystem;
  /** Scales the stored weekly rate and the existing calorie adjustment. */
  pace?: Pace;
  /** Nudges protein grams on the goal. Carbs take the difference. */
  macroFocus?: MacroFocus;
}

export async function completeOnboarding(input: OnboardingInput): Promise<void> {
  if (!(input.heightCm > 0) || !(input.currentWeightKg > 0) || !(input.targetWeightKg > 0)) {
    throw new Error(t("onb.err.body"));
  }
  await seedLocalCatalog();
  const plan = computeTdeePlan({
    sex: input.sex,
    weightKg: input.currentWeightKg,
    heightCm: input.heightCm,
    dateOfBirth: input.dateOfBirth,
    activityLevel: input.activityLevel,
    goalType: input.goalType,
    pace: input.pace,
    macroFocus: input.macroFocus,
  });
  const now = nowIso();
  const userId = getUserId();
  const profile: Profile = {
    id: userId,
    displayName: input.displayName.trim() || "Forger",
    dateOfBirth: input.dateOfBirth,
    sex: input.sex,
    heightCm: input.heightCm,
    currentWeightKg: input.currentWeightKg,
    activityLevel: input.activityLevel,
    units: input.units,
    themeId: "dark",
    xpTotal: 0,
    level: 1,
    tier: "bronze",
    pointsBalance: 0,
    onboardingCompletedAt: now,
    createdAt: now,
    updatedAt: now,
  };
  const goal: Goal = {
    id: newId(),
    userId,
    goalType: input.goalType,
    targetWeightKg: input.targetWeightKg,
    weeklyRateKg: weeklyRateKgFor(input.goalType, input.pace ?? "steady"),
    bmrKcal: plan.bmr,
    tdeeKcal: plan.tdee,
    calorieTarget: plan.calorieTarget,
    proteinG: plan.proteinG,
    carbsG: plan.carbsG,
    fatG: plan.fatG,
    waterMlTarget: plan.waterMlTarget,
    isActive: true,
    startedOn: now.slice(0, 10),
    createdAt: now,
  };

  await db.transaction("rw", db.profiles, db.goals, db.streaks, async () => {
    await db.profiles.put(profile);
    const old = await db.goals.where("userId").equals(userId).toArray();
    for (const g of old) await db.goals.update(g.id, { isActive: false });
    await db.goals.add(goal);
    for (const kind of STREAK_KINDS) {
      const existing = await db.streaks.get([userId, kind]);
      if (!existing) {
        await db.streaks.add({
          userId,
          kind,
          currentCount: 0,
          longestCount: 0,
          lastQualifiedDate: null,
        });
      }
    }
  });
  markOnboardingFinished();
  scheduleSync();
}

export async function setTheme(themeId: "dark" | "light"): Promise<void> {
  await db.profiles.update(getUserId(), { themeId, updatedAt: nowIso() });
  scheduleSync();
}

export async function updateDisplayName(displayName: string): Promise<void> {
  const name = displayName.trim();
  if (!name) return;
  await db.profiles.update(getUserId(), { displayName: name, updatedAt: nowIso() });
  scheduleSync();
}

export async function recomputeDay(localDate: string): Promise<DailyProgress | null> {
  const goal = await getActiveGoal();
  const profile = await getProfile();
  if (!goal || !profile) return null;

  const userId = getUserId();
  const logs = await db.foodLogs.where("[userId+localDate]").equals([userId, localDate]).toArray();
  const items = (
    await Promise.all(logs.map((l) => db.foodLogItems.where("foodLogId").equals(l.id).toArray()))
  ).flat();
  const waters = await db.waterLogs.where("[userId+localDate]").equals([userId, localDate]).toArray();

  const calories = items.reduce((s, i) => s + i.calories, 0);
  const proteinG = items.reduce((s, i) => s + i.proteinG, 0);
  const carbsG = items.reduce((s, i) => s + i.carbsG, 0);
  const fatG = items.reduce((s, i) => s + i.fatG, 0);
  const waterMl = waters.reduce((s, w) => s + w.amountMl, 0);

  const flags = hitFlags({
    userId,
    localDate,
    calorieTarget: goal.calorieTarget,
    proteinTarget: goal.proteinG,
    carbsTarget: goal.carbsG,
    fatTarget: goal.fatG,
    waterTargetMl: goal.waterMlTarget,
    calories,
    proteinG,
    carbsG,
    fatG,
    waterMl,
  });

  const existing = await db.dailyProgress.get([userId, localDate]);
  const progress: DailyProgress = {
    userId,
    localDate,
    calorieTarget: goal.calorieTarget,
    proteinTarget: goal.proteinG,
    carbsTarget: goal.carbsG,
    fatTarget: goal.fatG,
    waterTargetMl: goal.waterMlTarget,
    calories,
    proteinG,
    carbsG,
    fatG,
    waterMl,
    ...flags,
    xpEarned: existing?.xpEarned ?? 0,
    pointsEarned: existing?.pointsEarned ?? 0,
  };
  await db.dailyProgress.put(progress);
  await evaluateDailyRewards(progress);
  return progress;
}

export async function addMeal(input: {
  localDate: string;
  mealType: MealType;
  source: LogSource;
  notes?: string;
  photoDataUrl?: string;
  items: Array<{
    name: string;
    grams: number;
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
    fiberG?: number;
    micros?: Micronutrients;
    barcode?: string;
    confidence?: number;
    customFoodId?: string;
    recipeId?: string;
  }>;
}): Promise<string> {
  const userId = getUserId();
  const log: FoodLog = {
    id: newId(),
    userId,
    localDate: input.localDate,
    loggedAt: nowIso(),
    mealType: input.mealType,
    source: input.source,
    notes: input.notes,
    photoDataUrl: input.photoDataUrl,
    clientId: newId(),
  };
  const rows: FoodLogItem[] = input.items.map((item, index) => ({
    id: newId(),
    foodLogId: log.id,
    customFoodId: item.customFoodId,
    recipeId: item.recipeId,
    name: item.name,
    grams: item.grams,
    calories: item.calories,
    proteinG: item.proteinG,
    carbsG: item.carbsG,
    fatG: item.fatG,
    fiberG: item.fiberG,
    micros: item.micros ?? {},
    barcode: item.barcode,
    confidence: item.confidence,
    // keep insertion order stable even if we later sort
    ...(index >= 0 ? {} : {}),
  }));

  await db.transaction("rw", db.foodLogs, db.foodLogItems, async () => {
    await db.foodLogs.add(log);
    await db.foodLogItems.bulkAdd(rows);
  });

  await applyLedger({
    eventType: "logged_meal",
    pointsDelta: 5,
    xpDelta: 10,
    idempotencyKey: `logged_meal:${log.id}`,
  });
  await qualifyStreak("daily_log", input.localDate);
  await unlockAchievement("first_log");
  await recomputeDay(input.localDate);
  scheduleSync();
  return log.id;
}

export async function deleteMeal(logId: string, localDate: string): Promise<void> {
  await db.transaction("rw", db.foodLogs, db.foodLogItems, async () => {
    await db.foodLogItems.where("foodLogId").equals(logId).delete();
    await db.foodLogs.delete(logId);
  });
  await recomputeDay(localDate);
  scheduleSync();
}

export async function addWater(localDate: string, amountMl: number): Promise<void> {
  await db.waterLogs.add({
    id: newId(),
    userId: getUserId(),
    localDate,
    amountMl,
    loggedAt: nowIso(),
  });
  await recomputeDay(localDate);
  scheduleSync();
}

export async function addWeighIn(localDate: string, weightKg: number): Promise<void> {
  if (!(Number.isFinite(weightKg) && weightKg > 0)) return;
  const userId = getUserId();
  await db.bodyMetrics.add({
    id: newId(),
    userId,
    localDate,
    recordedAt: nowIso(),
    weightKg,
  });
  await db.profiles.update(userId, {
    currentWeightKg: weightKg,
    updatedAt: nowIso(),
  });
  await applyLedger({
    eventType: "weekly_weigh_in",
    pointsDelta: 12,
    xpDelta: 25,
    idempotencyKey: `weigh_in:${localDate}`,
  });
  await qualifyStreak("weigh_in", localDate);
  const count = await db.bodyMetrics.where("userId").equals(userId).count();
  if (count >= 4) await unlockAchievement("weigh_in_4");
  scheduleSync();
}

export async function saveCustomFood(food: Omit<CustomFood, "id" | "userId" | "createdAt">): Promise<string> {
  const id = newId();
  await db.customFoods.add({
    ...food,
    id,
    userId: getUserId(),
    createdAt: nowIso(),
  });
  scheduleSync();
  return id;
}

export async function saveRecipe(
  name: string,
  servings: number,
  ingredients: Array<{
    name: string;
    grams: number;
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
  }>,
): Promise<string> {
  const id = newId();
  await db.transaction("rw", db.recipes, db.recipeIngredients, async () => {
    await db.recipes.add({
      id,
      userId: getUserId(),
      name,
      servings,
      createdAt: nowIso(),
    });
    await db.recipeIngredients.bulkAdd(
      ingredients.map((ing) => ({
        id: newId(),
        recipeId: id,
        name: ing.name,
        grams: ing.grams,
        calories: ing.calories,
        proteinG: ing.proteinG,
        carbsG: ing.carbsG,
        fatG: ing.fatG,
      })),
    );
  });
  scheduleSync();
  return id;
}

export async function resetLocalData(): Promise<void> {
  clearOnboardingFinished();
  await Promise.all([
    db.profiles.clear(),
    db.goals.clear(),
    db.foodLogs.clear(),
    db.foodLogItems.clear(),
    db.customFoods.clear(),
    db.recipes.clear(),
    db.recipeIngredients.clear(),
    db.waterLogs.clear(),
    db.bodyMetrics.clear(),
    db.dailyProgress.clear(),
    db.streaks.clear(),
    db.userAchievements.clear(),
    db.rewardsLedger.clear(),
  ]);
}
