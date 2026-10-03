import type { FoodVisionResult } from "@/types";

export const FOOD_VISION_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["meal_summary", "items", "totals", "assumptions", "confidence"],
  properties: {
    meal_summary: { type: "string" },
    items: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "name",
          "estimated_grams",
          "calories",
          "protein_g",
          "carbs_g",
          "fat_g",
          "confidence",
        ],
        properties: {
          name: { type: "string" },
          estimated_grams: { type: "number" },
          calories: { type: "number" },
          protein_g: { type: "number" },
          carbs_g: { type: "number" },
          fat_g: { type: "number" },
          fiber_g: { type: "number" },
          micros: {
            type: "object",
            properties: {
              sodium_mg: { type: "number" },
              potassium_mg: { type: "number" },
              sugar_g: { type: "number" },
            },
          },
          confidence: { type: "number", minimum: 0, maximum: 1 },
        },
      },
    },
    totals: {
      type: "object",
      additionalProperties: false,
      required: ["calories", "protein_g", "carbs_g", "fat_g"],
      properties: {
        calories: { type: "number" },
        protein_g: { type: "number" },
        carbs_g: { type: "number" },
        fat_g: { type: "number" },
      },
    },
    assumptions: { type: "array", items: { type: "string" } },
    confidence: { type: "number", minimum: 0, maximum: 1 },
  },
} as const;

export const FOOD_VISION_SYSTEM_PROMPT = `You are ForgeFuel Vision, a clinical-grade nutrition estimator for a calorie and macro tracker.

Task: Identify every distinct edible item in the photo (or describe uncertainty if the image is not food). Estimate cooked edible weight in grams and nutrition.

Rules:
- Return ONLY valid JSON that matches the provided schema. No markdown, no prose.
- Prefer specific names ("grilled salmon fillet") over generic ones ("fish").
- Estimate grams of the edible portion only (no plate, wrapper, or bones).
- Calories and macros MUST be internally consistent: calories ≈ protein_g*4 + carbs_g*4 + fat_g*9 (±12%).
- Use widely accepted cooked-food density (USDA / Open Food Facts style).
- If a packaged label is readable, prefer the label values and scale to estimated grams.
- Split mixed plates into separate items (protein, starch, vegetable, sauce).
- confidence is 0-1 for that item. Overall confidence is the gram-weighted average.
- List assumptions (cooking fat, hidden oil, drink volume, default serving).
- If the image is not food, return one item named "Unrecognized" with zeros and confidence 0.05.
- Never invent micronutrients you cannot reasonably infer; omit them instead.
- Units: grams, kcal, and milligrams only.`;

export function emptyVisionResult(reason: string): FoodVisionResult {
  return {
    meal_summary: reason,
    items: [
      {
        name: "Unrecognized",
        estimated_grams: 0,
        calories: 0,
        protein_g: 0,
        carbs_g: 0,
        fat_g: 0,
        confidence: 0.05,
      },
    ],
    totals: { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
    assumptions: [reason],
    confidence: 0.05,
  };
}

export function demoVisionResult(): FoodVisionResult {
  return {
    meal_summary: "Demo plate — grilled chicken, rice, and broccoli (no API key)",
    items: [
      {
        name: "Grilled chicken breast",
        estimated_grams: 160,
        calories: 264,
        protein_g: 50,
        carbs_g: 0,
        fat_g: 6,
        fiber_g: 0,
        confidence: 0.62,
      },
      {
        name: "Steamed jasmine rice",
        estimated_grams: 180,
        calories: 234,
        protein_g: 4,
        carbs_g: 52,
        fat_g: 0.4,
        fiber_g: 0.6,
        confidence: 0.58,
      },
      {
        name: "Steamed broccoli",
        estimated_grams: 90,
        calories: 31,
        protein_g: 2.6,
        carbs_g: 6,
        fat_g: 0.3,
        fiber_g: 2.4,
        confidence: 0.7,
      },
    ],
    totals: { calories: 529, protein_g: 56.6, carbs_g: 58, fat_g: 6.7 },
    assumptions: [
      "Running in demo mode because no vision API key is configured.",
      "Chicken assumed skinless, grilled, no added oil.",
    ],
    confidence: 0.62,
  };
}

export function parseVisionJson(raw: string): FoodVisionResult {
  const cleaned = raw.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
  const parsed = JSON.parse(cleaned) as FoodVisionResult;
  if (!parsed.items?.length || !parsed.totals) {
    throw new Error("Vision payload missing items or totals");
  }
  return parsed;
}
