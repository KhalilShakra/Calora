import Dexie, { type EntityTable } from "dexie";
import type {
  Achievement,
  BodyMetric,
  CustomFood,
  DailyProgress,
  FoodLog,
  FoodLogItem,
  Goal,
  Profile,
  Recipe,
  RecipeIngredient,
  RewardsLedgerEntry,
  Streak,
  UserAchievement,
  WaterLog,
} from "@/types";

export class ForgeFuelDB extends Dexie {
  profiles!: EntityTable<Profile, "id">;
  goals!: EntityTable<Goal, "id">;
  foodLogs!: EntityTable<FoodLog, "id">;
  foodLogItems!: EntityTable<FoodLogItem, "id">;
  customFoods!: EntityTable<CustomFood, "id">;
  recipes!: EntityTable<Recipe, "id">;
  recipeIngredients!: EntityTable<RecipeIngredient, "id">;
  waterLogs!: EntityTable<WaterLog, "id">;
  bodyMetrics!: EntityTable<BodyMetric, "id">;
  dailyProgress!: EntityTable<DailyProgress, "localDate">;
  streaks!: EntityTable<Streak, "kind">;
  achievements!: EntityTable<Achievement, "id">;
  userAchievements!: EntityTable<UserAchievement, "achievementId">;
  rewardsLedger!: EntityTable<RewardsLedgerEntry, "id">;

  constructor() {
    super("forgefuel-app");
    this.version(1).stores({
      profiles: "id",
      goals: "id, userId, isActive",
      foodLogs: "id, userId, localDate, clientId, mealType",
      foodLogItems: "id, foodLogId",
      customFoods: "id, userId, name, barcode",
      recipes: "id, userId, name",
      recipeIngredients: "id, recipeId",
      waterLogs: "id, userId, localDate",
      bodyMetrics: "id, userId, localDate",
      dailyProgress: "[userId+localDate], localDate",
      streaks: "[userId+kind], kind",
      achievements: "id, code",
      userAchievements: "[userId+achievementId], achievementId",
      rewardsLedger: "id, userId, createdAt, idempotencyKey",
    });
    this.version(2).stores({
      foodLogs: "id, userId, localDate, clientId, mealType, [userId+localDate]",
      waterLogs: "id, userId, localDate, [userId+localDate]",
      bodyMetrics: "id, userId, localDate, [userId+localDate]",
    });
  }
}

export const db = new ForgeFuelDB();
