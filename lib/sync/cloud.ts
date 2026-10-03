import { ACHIEVEMENT_SEED } from "@/lib/achievements";
import { getUserId, useAuth } from "@/store/useAuth";
import { useUi } from "@/store/useUi";
import { db } from "@/lib/db";
import { getSupabase, isCloudEnabled } from "@/lib/supabase/client";
import type {
  ActivityLevel,
  BodyMetric,
  CustomFood,
  DailyProgress,
  FoodLog,
  FoodLogItem,
  Goal,
  GoalType,
  LogSource,
  MealType,
  Profile,
  Recipe,
  RecipeIngredient,
  RewardsLedgerEntry,
  RewardEvent,
  Sex,
  Streak,
  StreakKind,
  Tier,
  UnitSystem,
  UserAchievement,
  WaterLog,
} from "@/types";
import type { SupabaseClient } from "@supabase/supabase-js";

const CHUNK = 150;
let syncTimer: number | undefined;
let lastFailToast = 0;
let hydratingUser: string | null = null;

function num(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function str(value: unknown, fallback = ""): string {
  return value == null ? fallback : String(value);
}

function themeId(value: unknown): "dark" | "light" {
  return value === "light" ? "light" : "dark";
}

function chunk<T>(rows: T[], size = CHUNK): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size));
  return out;
}

async function upsert(
  supabase: SupabaseClient,
  table: string,
  rows: Record<string, unknown>[],
  onConflict?: string,
): Promise<void> {
  if (!rows.length) return;
  for (const part of chunk(rows)) {
    const { error } = await supabase.from(table).upsert(part, onConflict ? { onConflict } : undefined);
    if (error) throw error;
  }
}

function mapProfileRow(row: Record<string, unknown>, userId: string): Profile {
  return {
    id: userId,
    displayName: str(row.display_name, "Forger"),
    dateOfBirth: str(row.date_of_birth),
    sex: (str(row.sex, "other") as Sex) || "other",
    heightCm: num(row.height_cm),
    currentWeightKg: num(row.current_weight_kg),
    activityLevel: (str(row.activity_level, "moderate") as ActivityLevel) || "moderate",
    units: (str(row.units, "metric") as UnitSystem) || "metric",
    themeId: themeId(row.theme_id),
    xpTotal: num(row.xp_total),
    level: Math.max(1, num(row.level, 1)),
    tier: (str(row.tier, "bronze") as Tier) || "bronze",
    pointsBalance: num(row.points_balance),
    onboardingCompletedAt: row.onboarding_completed_at ? str(row.onboarding_completed_at) : null,
    createdAt: str(row.created_at),
    updatedAt: str(row.updated_at),
  };
}

export async function pullCloud(userId: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase || !userId) return;

  const profileRes = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (profileRes.error) throw profileRes.error;
  const remoteProfile = profileRes.data as Record<string, unknown> | null;
  const localProfile = await db.profiles.get(userId);
  if (remoteProfile?.onboarding_completed_at && !localProfile?.onboardingCompletedAt) {
    await db.profiles.put(mapProfileRow(remoteProfile, userId));
  } else if (!localProfile && remoteProfile?.onboarding_completed_at) {
    await db.profiles.put(mapProfileRow(remoteProfile, userId));
  }

  const [
    goalsRes,
    logsRes,
    watersRes,
    metricsRes,
    foodsRes,
    recipesRes,
    progressRes,
    streaksRes,
    ledgerRes,
    unlocksRes,
    achievementsRes,
  ] = await Promise.all([
    supabase.from("goals").select("*").eq("user_id", userId),
    supabase.from("food_logs").select("*").eq("user_id", userId),
    supabase.from("water_logs").select("*").eq("user_id", userId),
    supabase.from("body_metrics").select("*").eq("user_id", userId),
    supabase.from("custom_foods").select("*").eq("user_id", userId),
    supabase.from("recipes").select("*").eq("user_id", userId),
    supabase.from("daily_progress").select("*").eq("user_id", userId),
    supabase.from("streaks").select("*").eq("user_id", userId),
    supabase.from("rewards_ledger").select("*").eq("user_id", userId),
    supabase.from("user_achievements").select("*").eq("user_id", userId),
    supabase.from("achievements").select("id, code"),
  ]);

  for (const res of [goalsRes, logsRes, watersRes, metricsRes, foodsRes, recipesRes, progressRes, streaksRes, ledgerRes, unlocksRes, achievementsRes]) {
    if (res.error) throw res.error;
  }

  const localActive = await db.goals.filter((g) => g.userId === userId && g.isActive).first();
  for (const row of (goalsRes.data ?? []) as Record<string, unknown>[]) {
    const id = str(row.id);
    if (!id || (await db.goals.get(id))) continue;
    await db.goals.put({
      id,
      userId,
      goalType: str(row.goal_type) as GoalType,
      targetWeightKg: num(row.target_weight_kg),
      weeklyRateKg: num(row.weekly_rate_kg),
      bmrKcal: num(row.bmr_kcal),
      tdeeKcal: num(row.tdee_kcal),
      calorieTarget: num(row.calorie_target),
      proteinG: num(row.protein_g),
      carbsG: num(row.carbs_g),
      fatG: num(row.fat_g),
      waterMlTarget: num(row.water_ml_target, 2500),
      isActive: Boolean(row.is_active) && !localActive,
      startedOn: str(row.started_on),
      createdAt: str(row.created_at),
    } satisfies Goal);
  }

  const localFoods = await db.customFoods.where("userId").equals(userId).toArray();
  const foodIds = new Set(localFoods.map((f) => f.id));
  for (const row of (foodsRes.data ?? []) as Record<string, unknown>[]) {
    const id = str(row.id);
    if (!id || foodIds.has(id)) continue;
    await db.customFoods.put({
      id,
      userId,
      name: str(row.name),
      brand: row.brand ? str(row.brand) : undefined,
      servingLabel: str(row.serving_label, "1 serving"),
      servingSizeG: num(row.serving_size_g, 100),
      calories: num(row.calories),
      proteinG: num(row.protein_g),
      carbsG: num(row.carbs_g),
      fatG: num(row.fat_g),
      micros: (row.micros as CustomFood["micros"]) ?? {},
      barcode: row.barcode ? str(row.barcode) : undefined,
      createdAt: str(row.created_at),
    } satisfies CustomFood);
  }

  const localRecipes = await db.recipes.where("userId").equals(userId).toArray();
  const recipeIds = new Set(localRecipes.map((r) => r.id));
  const newRecipeIds: string[] = [];
  for (const row of (recipesRes.data ?? []) as Record<string, unknown>[]) {
    const id = str(row.id);
    if (!id || recipeIds.has(id)) continue;
    await db.recipes.put({
      id,
      userId,
      name: str(row.name),
      servings: num(row.servings, 1),
      notes: row.notes ? str(row.notes) : undefined,
      createdAt: str(row.created_at),
    } satisfies Recipe);
    newRecipeIds.push(id);
  }
  if (newRecipeIds.length) {
    for (const part of chunk(newRecipeIds)) {
      const ings = await supabase.from("recipe_ingredients").select("*").in("recipe_id", part);
      if (ings.error) throw ings.error;
      for (const row of (ings.data ?? []) as Record<string, unknown>[]) {
        const id = str(row.id);
        if (!id || (await db.recipeIngredients.get(id))) continue;
        await db.recipeIngredients.put({
          id,
          recipeId: str(row.recipe_id),
          customFoodId: row.custom_food_id ? str(row.custom_food_id) : undefined,
          name: str(row.name),
          grams: num(row.grams),
          calories: num(row.calories),
          proteinG: num(row.protein_g),
          carbsG: num(row.carbs_g),
          fatG: num(row.fat_g),
        } satisfies RecipeIngredient);
      }
    }
  }

  const localLogs = await db.foodLogs.where("userId").equals(userId).toArray();
  const logIds = new Set(localLogs.map((l) => l.id));
  const clientIds = new Set(localLogs.map((l) => l.clientId).filter(Boolean));
  const newLogIds: string[] = [];
  for (const row of (logsRes.data ?? []) as Record<string, unknown>[]) {
    const id = str(row.id);
    const clientId = row.client_id ? str(row.client_id) : "";
    if (!id || logIds.has(id) || (clientId && clientIds.has(clientId))) continue;
    await db.foodLogs.put({
      id,
      userId,
      localDate: str(row.local_date),
      loggedAt: str(row.logged_at),
      mealType: str(row.meal_type, "snack") as MealType,
      source: str(row.source, "manual") as LogSource,
      notes: row.notes ? str(row.notes) : undefined,
      clientId: clientId || id,
    } satisfies FoodLog);
    newLogIds.push(id);
  }
  if (newLogIds.length) {
    for (const part of chunk(newLogIds)) {
      const items = await supabase.from("food_log_items").select("*").in("food_log_id", part);
      if (items.error) throw items.error;
      for (const row of (items.data ?? []) as Record<string, unknown>[]) {
        const id = str(row.id);
        if (!id || (await db.foodLogItems.get(id))) continue;
        await db.foodLogItems.put({
          id,
          foodLogId: str(row.food_log_id),
          customFoodId: row.custom_food_id ? str(row.custom_food_id) : undefined,
          recipeId: row.recipe_id ? str(row.recipe_id) : undefined,
          name: str(row.name),
          grams: num(row.grams),
          calories: num(row.calories),
          proteinG: num(row.protein_g),
          carbsG: num(row.carbs_g),
          fatG: num(row.fat_g),
          fiberG: row.fiber_g == null ? undefined : num(row.fiber_g),
          micros: (row.micros as FoodLogItem["micros"]) ?? {},
          barcode: row.barcode ? str(row.barcode) : undefined,
          confidence: row.confidence == null ? undefined : num(row.confidence),
        } satisfies FoodLogItem);
      }
    }
  }

  for (const row of (watersRes.data ?? []) as Record<string, unknown>[]) {
    const id = str(row.id);
    if (!id || (await db.waterLogs.get(id))) continue;
    await db.waterLogs.put({
      id,
      userId,
      localDate: str(row.local_date),
      amountMl: num(row.amount_ml),
      loggedAt: str(row.logged_at),
    } satisfies WaterLog);
  }

  for (const row of (metricsRes.data ?? []) as Record<string, unknown>[]) {
    const id = str(row.id);
    if (!id || (await db.bodyMetrics.get(id))) continue;
    await db.bodyMetrics.put({
      id,
      userId,
      localDate: str(row.local_date),
      recordedAt: str(row.recorded_at),
      weightKg: num(row.weight_kg),
    } satisfies BodyMetric);
  }

  for (const row of (progressRes.data ?? []) as Record<string, unknown>[]) {
    const localDate = str(row.local_date);
    if (!localDate || (await db.dailyProgress.get([userId, localDate]))) continue;
    await db.dailyProgress.put({
      userId,
      localDate,
      calorieTarget: num(row.calorie_target),
      proteinTarget: num(row.protein_target),
      carbsTarget: num(row.carbs_target),
      fatTarget: num(row.fat_target),
      waterTargetMl: num(row.water_target_ml),
      calories: num(row.calories),
      proteinG: num(row.protein_g),
      carbsG: num(row.carbs_g),
      fatG: num(row.fat_g),
      waterMl: num(row.water_ml),
      hitCalories: Boolean(row.hit_calories),
      hitMacros: Boolean(row.hit_macros),
      hitWater: Boolean(row.hit_water),
      xpEarned: num(row.xp_earned),
      pointsEarned: num(row.points_earned),
    } satisfies DailyProgress);
  }

  for (const row of (streaksRes.data ?? []) as Record<string, unknown>[]) {
    const kind = str(row.kind) as StreakKind;
    if (!kind || (await db.streaks.get([userId, kind]))) continue;
    await db.streaks.put({
      userId,
      kind,
      currentCount: num(row.current_count),
      longestCount: num(row.longest_count),
      lastQualifiedDate: row.last_qualified_date ? str(row.last_qualified_date) : null,
    } satisfies Streak);
  }

  for (const row of (ledgerRes.data ?? []) as Record<string, unknown>[]) {
    const id = str(row.id);
    if (!id || (await db.rewardsLedger.get(id))) continue;
    await db.rewardsLedger.put({
      id,
      userId,
      eventType: str(row.event_type) as RewardEvent,
      pointsDelta: num(row.points_delta),
      xpDelta: num(row.xp_delta),
      idempotencyKey: row.idempotency_key ? str(row.idempotency_key) : undefined,
      metadata: (row.metadata as Record<string, unknown>) ?? undefined,
      createdAt: str(row.created_at),
    } satisfies RewardsLedgerEntry);
  }

  const localIdByRemoteId = new Map(
    ((achievementsRes.data ?? []) as Array<{ id: string; code: string }>).map((a) => {
      const local = ACHIEVEMENT_SEED.find((s) => s.code === a.code);
      return [a.id, local?.id ?? a.code] as const;
    }),
  );

  for (const row of (unlocksRes.data ?? []) as Record<string, unknown>[]) {
    const remoteAchievementId = str(row.achievement_id);
    const achievementId = localIdByRemoteId.get(remoteAchievementId) ?? remoteAchievementId;
    if (await db.userAchievements.get([userId, achievementId])) continue;
    await db.userAchievements.put({
      userId,
      achievementId,
      unlockedAt: str(row.unlocked_at),
    } satisfies UserAchievement);
  }
}

export async function pushCloud(userId: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase || !userId) return;

  const profile = await db.profiles.get(userId);
  const [
    goals,
    logs,
    foods,
    recipes,
    waters,
    metrics,
    progress,
    streaks,
    ledger,
    unlocks,
  ] = await Promise.all([
    db.goals.where("userId").equals(userId).toArray(),
    db.foodLogs.where("userId").equals(userId).toArray(),
    db.customFoods.where("userId").equals(userId).toArray(),
    db.recipes.where("userId").equals(userId).toArray(),
    db.waterLogs.where("userId").equals(userId).toArray(),
    db.bodyMetrics.where("userId").equals(userId).toArray(),
    db.dailyProgress.where("userId").equals(userId).toArray(),
    db.streaks.where("userId").equals(userId).toArray(),
    db.rewardsLedger.where("userId").equals(userId).toArray(),
    db.userAchievements.where("userId").equals(userId).toArray(),
  ]);

  const actives = goals.filter((g) => g.isActive).sort((a, b) => b.startedOn.localeCompare(a.startedOn));
  if (actives.length > 1) {
    for (const extra of actives.slice(1)) {
      extra.isActive = false;
      await db.goals.update(extra.id, { isActive: false });
    }
  }
  const localActive = actives[0];
  if (localActive) {
    await supabase
      .from("goals")
      .update({ is_active: false })
      .eq("user_id", userId)
      .eq("is_active", true)
      .neq("id", localActive.id);
  }

  await upsert(
    supabase,
    "custom_foods",
    foods.map((food) => ({
      id: food.id,
      user_id: userId,
      name: food.name,
      brand: food.brand ?? null,
      serving_label: food.servingLabel,
      serving_size_g: food.servingSizeG,
      calories: food.calories,
      protein_g: food.proteinG,
      carbs_g: food.carbsG,
      fat_g: food.fatG,
      micros: food.micros ?? {},
      barcode: food.barcode ?? null,
      origin: "custom",
      created_at: food.createdAt,
    })),
  );

  await upsert(
    supabase,
    "recipes",
    recipes.map((recipe) => ({
      id: recipe.id,
      user_id: userId,
      name: recipe.name,
      servings: recipe.servings,
      notes: recipe.notes ?? null,
      created_at: recipe.createdAt,
    })),
  );

  const ingredients = (
    await Promise.all(recipes.map((recipe) => db.recipeIngredients.where("recipeId").equals(recipe.id).toArray()))
  ).flat();
  await upsert(
    supabase,
    "recipe_ingredients",
    ingredients.map((ing) => ({
      id: ing.id,
      recipe_id: ing.recipeId,
      custom_food_id: ing.customFoodId ?? null,
      name: ing.name,
      grams: ing.grams,
      calories: ing.calories,
      protein_g: ing.proteinG,
      carbs_g: ing.carbsG,
      fat_g: ing.fatG,
    })),
  );

  const { data: remoteLogs, error: remoteLogError } = await supabase
    .from("food_logs")
    .select("id, client_id")
    .eq("user_id", userId);
  if (remoteLogError) throw remoteLogError;
  const remoteLogIds = new Set((remoteLogs ?? []).map((l) => l.id as string));
  const remoteClients = new Set(
    (remoteLogs ?? []).map((l) => l.client_id as string | null).filter((id): id is string => Boolean(id)),
  );
  const logsToPush = logs.filter((log) => remoteLogIds.has(log.id) || !remoteClients.has(log.clientId));

  await upsert(
    supabase,
    "food_logs",
    logsToPush.map((log) => ({
      id: log.id,
      user_id: userId,
      local_date: log.localDate,
      logged_at: log.loggedAt,
      meal_type: log.mealType,
      source: log.source,
      notes: log.notes ?? null,
      photo_url: null,
      client_id: log.clientId,
    })),
    "id",
  );

  const items = (
    await Promise.all(logsToPush.map((log) => db.foodLogItems.where("foodLogId").equals(log.id).toArray()))
  ).flat();
  await upsert(
    supabase,
    "food_log_items",
    items.map((item, index) => ({
      id: item.id,
      food_log_id: item.foodLogId,
      custom_food_id: item.customFoodId ?? null,
      recipe_id: item.recipeId ?? null,
      name: item.name,
      grams: item.grams,
      calories: item.calories,
      protein_g: item.proteinG,
      carbs_g: item.carbsG,
      fat_g: item.fatG,
      fiber_g: item.fiberG ?? null,
      micros: item.micros ?? {},
      barcode: item.barcode ?? null,
      confidence: item.confidence ?? null,
      sort_order: index,
    })),
  );

  await upsert(
    supabase,
    "water_logs",
    waters.map((water) => ({
      id: water.id,
      user_id: userId,
      local_date: water.localDate,
      amount_ml: water.amountMl,
      logged_at: water.loggedAt,
    })),
  );

  await upsert(
    supabase,
    "body_metrics",
    metrics.map((metric) => ({
      id: metric.id,
      user_id: userId,
      local_date: metric.localDate,
      recorded_at: metric.recordedAt,
      weight_kg: metric.weightKg,
      source: "manual",
    })),
  );

  await upsert(
    supabase,
    "daily_progress",
    progress.map((row) => ({
      user_id: userId,
      local_date: row.localDate,
      calorie_target: row.calorieTarget,
      protein_target: row.proteinTarget,
      carbs_target: row.carbsTarget,
      fat_target: row.fatTarget,
      water_target_ml: row.waterTargetMl,
      calories: row.calories,
      protein_g: row.proteinG,
      carbs_g: row.carbsG,
      fat_g: row.fatG,
      water_ml: row.waterMl,
      hit_calories: row.hitCalories,
      hit_macros: row.hitMacros,
      hit_water: row.hitWater,
      xp_earned: row.xpEarned,
      points_earned: row.pointsEarned,
    })),
    "user_id,local_date",
  );

  await upsert(
    supabase,
    "streaks",
    streaks.map((row) => ({
      user_id: userId,
      kind: row.kind,
      current_count: row.currentCount,
      longest_count: row.longestCount,
      last_qualified_date: row.lastQualifiedDate,
    })),
    "user_id,kind",
  );

  const { data: remoteAch, error: achError } = await supabase.from("achievements").select("id, code");
  if (achError) throw achError;
  const remoteIdByCode = new Map((remoteAch ?? []).map((a) => [a.code as string, a.id as string]));
  await upsert(
    supabase,
    "user_achievements",
    unlocks
      .map((row) => {
        const seed = ACHIEVEMENT_SEED.find((a) => a.id === row.achievementId || a.code === row.achievementId);
        const achievementId = (seed && remoteIdByCode.get(seed.code)) || remoteIdByCode.get(row.achievementId);
        if (!achievementId) return null;
        return {
          user_id: userId,
          achievement_id: achievementId,
          unlocked_at: row.unlockedAt,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null),
    "user_id,achievement_id",
  );

  const { data: remoteLedger, error: ledgerError } = await supabase
    .from("rewards_ledger")
    .select("id, idempotency_key")
    .eq("user_id", userId);
  if (ledgerError) throw ledgerError;
  const remoteLedgerIds = new Set((remoteLedger ?? []).map((r) => r.id as string));
  const remoteIdem = new Set(
    (remoteLedger ?? [])
      .map((r) => r.idempotency_key as string | null)
      .filter((key): key is string => Boolean(key)),
  );
  const ledgerToPush = ledger.filter(
    (row) => remoteLedgerIds.has(row.id) || !row.idempotencyKey || !remoteIdem.has(row.idempotencyKey),
  );
  await upsert(
    supabase,
    "rewards_ledger",
    ledgerToPush.map((row) => ({
      id: row.id,
      user_id: userId,
      event_type: row.eventType,
      points_delta: row.pointsDelta,
      xp_delta: row.xpDelta,
      idempotency_key: row.idempotencyKey ?? null,
      metadata: row.metadata ?? {},
      created_at: row.createdAt,
    })),
  );

  await upsert(
    supabase,
    "goals",
    goals.map((goal) => ({
      id: goal.id,
      user_id: userId,
      goal_type: goal.goalType,
      target_weight_kg: goal.targetWeightKg,
      weekly_rate_kg: goal.weeklyRateKg,
      bmr_kcal: goal.bmrKcal,
      tdee_kcal: goal.tdeeKcal,
      calorie_target: goal.calorieTarget,
      protein_g: goal.proteinG,
      carbs_g: goal.carbsG,
      fat_g: goal.fatG,
      water_ml_target: goal.waterMlTarget,
      is_active: goal.isActive,
      started_on: goal.startedOn,
      created_at: goal.createdAt,
    })),
  );

  if (profile) {
    await upsert(supabase, "profiles", [
      {
        id: userId,
        display_name: profile.displayName,
        date_of_birth: profile.dateOfBirth || null,
        sex: profile.sex,
        height_cm: profile.heightCm,
        current_weight_kg: profile.currentWeightKg,
        activity_level: profile.activityLevel,
        units: profile.units,
        theme_id: profile.themeId,
        xp_total: profile.xpTotal,
        level: profile.level,
        tier: profile.tier,
        points_balance: profile.pointsBalance,
        onboarding_completed_at: profile.onboardingCompletedAt,
        created_at: profile.createdAt,
        updated_at: profile.updatedAt,
      },
    ]);
  }
}

export async function hydrateCloudUser(userId: string): Promise<void> {
  if (!userId || hydratingUser === userId) return;
  hydratingUser = userId;
  try {
    await pullCloud(userId);
    await pushCloud(userId);
  } catch {
    hydratingUser = null;
    throw new Error("Cloud sync failed");
  }
}

export function scheduleSync(): void {
  if (typeof window === "undefined") return;
  if (!isCloudEnabled() || !useAuth.getState().signedIn) return;
  if (!navigator.onLine) return;
  const userId = getUserId();
  if (!userId) return;
  window.clearTimeout(syncTimer);
  syncTimer = window.setTimeout(() => {
    void pushCloud(userId).catch(() => {
      const now = Date.now();
      if (now - lastFailToast > 30_000) {
        lastFailToast = now;
        useUi.getState().showToast("Saved on this device · cloud will retry");
      }
    });
  }, 450);
}
