import type { ActivityLevel, GoalType, MealType } from "@/types";

export const GOAL_LABEL: Record<GoalType, string> = {
  lose: "Cut",
  gain: "Bulk",
  maintain: "Maintain",
  recomp: "Recomp",
};

export const ACTIVITY_LABEL: Record<ActivityLevel, string> = {
  sedentary: "Desk days",
  light: "Light training",
  moderate: "Steady training",
  active: "High output",
  very_active: "Athlete",
};

export const MEAL_LABEL: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

export function greetingForHour(hour = new Date().getHours()): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function suggestedMeal(hour = new Date().getHours()): MealType {
  if (hour < 10) return "breakfast";
  if (hour < 15) return "lunch";
  if (hour < 21) return "dinner";
  return "snack";
}
