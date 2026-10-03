export type Sex = "male" | "female" | "other";
export type UnitSystem = "metric" | "imperial";
export type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "very_active";
export type GoalType = "lose" | "gain" | "maintain" | "recomp";
export type MealType = "breakfast" | "lunch" | "dinner" | "snack";
export type LogSource =
  | "manual"
  | "quick_add"
  | "barcode"
  | "ai_vision"
  | "recipe"
  | "custom_food";
export type StreakKind =
  | "daily_log"
  | "calorie_target"
  | "macro_target"
  | "water"
  | "weigh_in";
export type RewardEvent =
  | "hit_calories"
  | "hit_macros"
  | "hit_water"
  | "logged_meal"
  | "streak_bonus"
  | "weekly_weigh_in"
  | "achievement"
  | "level_up"
  | "redemption"
  | "adjustment";
export type Tier = "bronze" | "silver" | "gold" | "platinum";

export interface Micronutrients {
  fiber_g?: number;
  sugar_g?: number;
  sodium_mg?: number;
  potassium_mg?: number;
  calcium_mg?: number;
  iron_mg?: number;
  vitamin_c_mg?: number;
  vitamin_a_mcg?: number;
  vitamin_d_mcg?: number;
}

export interface Profile {
  id: string;
  displayName: string;
  dateOfBirth: string;
  sex: Sex;
  heightCm: number;
  currentWeightKg: number;
  activityLevel: ActivityLevel;
  units: UnitSystem;
  themeId: "dark" | "light";
  xpTotal: number;
  level: number;
  tier: Tier;
  pointsBalance: number;
  onboardingCompletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Goal {
  id: string;
  userId: string;
  goalType: GoalType;
  targetWeightKg: number;
  weeklyRateKg: number;
  bmrKcal: number;
  tdeeKcal: number;
  calorieTarget: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  waterMlTarget: number;
  isActive: boolean;
  startedOn: string;
  createdAt: string;
}

export interface FoodLog {
  id: string;
  userId: string;
  localDate: string;
  loggedAt: string;
  mealType: MealType;
  source: LogSource;
  notes?: string;
  photoDataUrl?: string;
  clientId: string;
}

export interface FoodLogItem {
  id: string;
  foodLogId: string;
  customFoodId?: string;
  recipeId?: string;
  name: string;
  grams: number;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG?: number;
  micros: Micronutrients;
  barcode?: string;
  confidence?: number;
}

export interface CustomFood {
  id: string;
  userId: string;
  name: string;
  brand?: string;
  servingLabel: string;
  servingSizeG: number;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  micros: Micronutrients;
  barcode?: string;
  createdAt: string;
}

export interface Recipe {
  id: string;
  userId: string;
  name: string;
  servings: number;
  notes?: string;
  createdAt: string;
}

export interface RecipeIngredient {
  id: string;
  recipeId: string;
  customFoodId?: string;
  name: string;
  grams: number;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface WaterLog {
  id: string;
  userId: string;
  localDate: string;
  amountMl: number;
  loggedAt: string;
}

export interface BodyMetric {
  id: string;
  userId: string;
  localDate: string;
  recordedAt: string;
  weightKg: number;
}

export interface DailyProgress {
  userId: string;
  localDate: string;
  calorieTarget: number;
  proteinTarget: number;
  carbsTarget: number;
  fatTarget: number;
  waterTargetMl: number;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  waterMl: number;
  hitCalories: boolean;
  hitMacros: boolean;
  hitWater: boolean;
  xpEarned: number;
  pointsEarned: number;
}

export interface Streak {
  userId: string;
  kind: StreakKind;
  currentCount: number;
  longestCount: number;
  lastQualifiedDate: string | null;
}

export interface Achievement {
  id: string;
  code: string;
  title: string;
  description: string;
  xpReward: number;
  pointsReward: number;
  tier: Tier;
}

export interface UserAchievement {
  userId: string;
  achievementId: string;
  unlockedAt: string;
}

export interface RewardsLedgerEntry {
  id: string;
  userId: string;
  eventType: RewardEvent;
  pointsDelta: number;
  xpDelta: number;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface FoodVisionItem {
  name: string;
  estimated_grams: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g?: number;
  micros?: Micronutrients;
  confidence: number;
}

export interface FoodVisionResult {
  meal_summary: string;
  items: FoodVisionItem[];
  totals: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  };
  assumptions: string[];
  confidence: number;
}

export const LOCAL_USER_ID = "local-user";
export const MEALS: MealType[] = ["breakfast", "lunch", "dinner", "snack"];
