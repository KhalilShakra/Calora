import type { ActivityLevel, GoalType, Sex } from "@/types";
import { ageFromDob } from "@/lib/dates";

const ACTIVITY_MULT: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

const GOAL_ADJ: Record<GoalType, number> = {
  lose: -500,
  gain: 350,
  maintain: 0,
  recomp: -150,
};

/** Steady matches the original cut / bulk / recomp adjustments. */
const PACE_SCALE = {
  gentle: 0.6,
  steady: 1,
  fast: 1.4,
} as const;

const BASE_WEEKLY_KG: Record<GoalType, number> = {
  lose: 0.5,
  gain: 0.3,
  maintain: 0,
  recomp: 0,
};

export type Pace = keyof typeof PACE_SCALE;
export type MacroFocus = "protein" | "simple";

export function weeklyRateKgFor(goalType: GoalType, pace: Pace = "steady"): number {
  return Math.round(BASE_WEEKLY_KG[goalType] * PACE_SCALE[pace] * 100) / 100;
}

function calorieAdjustment(goalType: GoalType, pace: Pace): number {
  return Math.round(GOAL_ADJ[goalType] * PACE_SCALE[pace]);
}

export interface TdeeInput {
  sex: Sex;
  weightKg: number;
  heightCm: number;
  dateOfBirth: string;
  activityLevel: ActivityLevel;
  goalType: GoalType;
  /** Omitted pace stays on the original deficit and surplus. */
  pace?: Pace;
  /** Omitted focus keeps the original protein-per-kilo rates. */
  macroFocus?: MacroFocus;
}

export interface TdeePlan {
  age: number;
  bmr: number;
  tdee: number;
  calorieTarget: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  waterMlTarget: number;
}

export function computeTdeePlan(input: TdeeInput): TdeePlan {
  const age = ageFromDob(input.dateOfBirth);
  let bmr = 10 * input.weightKg + 6.25 * input.heightCm - 5 * age;
  bmr += input.sex === "female" ? -161 : 5;

  const tdee = bmr * ACTIVITY_MULT[input.activityLevel];
  const calorieTarget = Math.max(
    1200,
    Math.round(tdee + calorieAdjustment(input.goalType, input.pace ?? "steady")),
  );

  const baseProteinPerKg =
    input.goalType === "lose" || input.goalType === "recomp"
      ? 2.2
      : input.goalType === "gain"
        ? 2.0
        : 1.8;
  const proteinPerKg =
    input.macroFocus === "protein"
      ? baseProteinPerKg + 0.3
      : input.macroFocus === "simple"
        ? Math.max(1.4, baseProteinPerKg - 0.4)
        : baseProteinPerKg;
  const proteinG = Math.round(proteinPerKg * input.weightKg);
  const fatG = Math.round(Math.max(0.7 * input.weightKg, calorieTarget * 0.25 / 9));
  const carbCalories = Math.max(0, calorieTarget - proteinG * 4 - fatG * 9);
  const carbsG = Math.round(carbCalories / 4);
  const waterMlTarget = Math.round(
    Math.min(4000, Math.max(2000, input.weightKg * 35)),
  );

  return {
    age,
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    calorieTarget,
    proteinG,
    carbsG,
    fatG,
    waterMlTarget,
  };
}

export function withinTarget(actual: number, target: number, tol = 0.1): boolean {
  if (target <= 0) return false;
  const ratio = actual / target;
  return ratio >= 1 - tol && ratio <= 1 + tol;
}

export function caloriesNearTarget(actual: number, target: number): boolean {
  if (target <= 0) return false;
  return actual >= target * 0.9 && actual <= target * 1.1;
}
