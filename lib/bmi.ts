export type BmiCategory = "underweight" | "healthy" | "overweight" | "obese";

export interface BmiResult {
  value: number;
  category: BmiCategory;
  label: string;
  healthyMinKg: number;
  healthyMaxKg: number;
}

const CATEGORY_LABEL: Record<BmiCategory, string> = {
  underweight: "Underweight",
  healthy: "Healthy",
  overweight: "Overweight",
  obese: "Obese",
};

/** WHO adult BMI: kg / m² */
export function computeBmi(weightKg: number, heightCm: number): number {
  const meters = heightCm / 100;
  if (weightKg <= 0 || meters <= 0) return 0;
  return Math.round((weightKg / (meters * meters)) * 10) / 10;
}

export function categorizeBmi(bmi: number): BmiCategory {
  if (bmi <= 0) return "healthy";
  if (bmi < 18.5) return "underweight";
  if (bmi < 25) return "healthy";
  if (bmi < 30) return "overweight";
  return "obese";
}

export function healthyWeightRange(heightCm: number): { minKg: number; maxKg: number } {
  const meters = heightCm / 100;
  const sq = meters * meters;
  return {
    minKg: Math.round(18.5 * sq * 10) / 10,
    maxKg: Math.round(24.9 * sq * 10) / 10,
  };
}

export function computeBmiResult(weightKg: number, heightCm: number): BmiResult {
  const value = computeBmi(weightKg, heightCm);
  const category = categorizeBmi(value);
  const range = healthyWeightRange(heightCm);
  return {
    value,
    category,
    label: CATEGORY_LABEL[category],
    healthyMinKg: range.minKg,
    healthyMaxKg: range.maxKg,
  };
}

/** Position on a 15–40 BMI scale, used by the meter. */
export function bmiMeterPct(bmi: number): number {
  return Math.min(100, Math.max(0, ((bmi - 15) / 25) * 100));
}
