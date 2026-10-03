import { computeBmiResult, type BmiCategory } from "@/lib/bmi";
import { GOAL_LABEL } from "@/lib/labels";
import type { GoalType, MealType } from "@/types";

export type TipTone = "coach" | "alert" | "win";

export interface Tip {
  id: string;
  title: string;
  body: string;
  actionLabel?: string;
  href?: string;
  meal?: MealType;
  tone: TipTone;
  category: "protein" | "calories" | "water" | "habit" | "bmi" | "goal";
}

export interface TipContext {
  date: string;
  hour: number;
  goalType: GoalType;
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
  mealsLogged: number;
  streak: number;
  weightKg: number;
  heightCm: number;
  loggedMeals: MealType[];
}

function ratio(actual: number, target: number): number {
  if (target <= 0) return 0;
  return actual / target;
}

function rotate<T>(items: T[], seed: string): T {
  const sum = [...seed].reduce((n, ch) => n + ch.charCodeAt(0), 0);
  return items[sum % items.length];
}

export function suggestedMealFromHour(hour: number): MealType {
  if (hour < 10) return "breakfast";
  if (hour < 15) return "lunch";
  if (hour < 21) return "dinner";
  return "snack";
}

export function pickTips(ctx: TipContext): Tip[] {
  const tips: Tip[] = [];
  const nextMeal = suggestedMealFromHour(ctx.hour);
  const calR = ratio(ctx.calories, ctx.calorieTarget);
  const proR = ratio(ctx.proteinG, ctx.proteinTarget);
  const waterR = ratio(ctx.waterMl, ctx.waterTargetMl);
  const proteinLeft = Math.max(0, Math.round(ctx.proteinTarget - ctx.proteinG));
  const kcalLeft = Math.round(ctx.calorieTarget - ctx.calories);
  const waterLeft = Math.max(0, ctx.waterTargetMl - ctx.waterMl);
  const bmi = computeBmiResult(ctx.weightKg, ctx.heightCm);

  if (ctx.mealsLogged === 0) {
    tips.push({
      id: "log-first",
      title: ctx.hour >= 14 ? "The day is moving — log fuel" : "Start the forge",
      body:
        ctx.hour >= 14
          ? "Nothing is logged yet. A rough log beats a perfect skip. Snap a plate or quick-add in under 20 seconds."
          : `Log ${nextMeal} first. Consistency beats a perfect estimate.`,
      actionLabel: `Log ${nextMeal}`,
      href: "/log",
      meal: nextMeal,
      tone: ctx.hour >= 16 ? "alert" : "coach",
      category: "habit",
    });
  }

  if (ctx.mealsLogged > 0 && !ctx.loggedMeals.includes(nextMeal) && ctx.hour >= 11) {
    tips.push({
      id: "next-meal",
      title: `${capitalize(nextMeal)} is still empty`,
      body: "Keep the diary honest. Even leftovers or a shake count.",
      actionLabel: `Add ${nextMeal}`,
      href: "/log",
      meal: nextMeal,
      tone: "coach",
      category: "habit",
    });
  }

  if (proR < 0.55 && calR >= 0.55 && proteinLeft > 15) {
    tips.push({
      id: "protein-behind",
      title: `${proteinLeft}g protein still open`,
      body:
        ctx.goalType === "gain" || ctx.goalType === "recomp"
          ? "Calories are filling up faster than protein. Add chicken, Greek yogurt, eggs, or a whey shake before another carb-heavy plate."
          : "On a cut, protein protects muscle. Swap the next snack for a lean protein instead of extra bread or sweets.",
      actionLabel: "Quick-add protein",
      href: "/log",
      tone: "alert",
      category: "protein",
    });
  } else if (proR < 0.35 && ctx.hour >= 13) {
    tips.push({
      id: "protein-early",
      title: "Front-load protein",
      body: `You are at ${Math.round(ctx.proteinG)}g of ${ctx.proteinTarget}g. Aim for 30–40g at the next meal so you are not chasing it at night.`,
      actionLabel: "Log protein",
      href: "/log",
      tone: "coach",
      category: "protein",
    });
  }

  if (calR > 1.12) {
    tips.push({
      id: "over-target",
      title: `${Math.abs(kcalLeft)} kcal over target`,
      body:
        ctx.goalType === "lose"
          ? "One overage does not break a cut. Make the next meal high-volume: vegetables, lean protein, and water. Skip the 'make-up starve' — just return to target tomorrow."
          : "You are above the plan. If this was a training day, you are fine. If not, keep dinner lighter and walk 10 minutes.",
      tone: "alert",
      category: "calories",
    });
  } else if (kcalLeft > 350 && ctx.hour >= 18 && ctx.goalType === "gain") {
    tips.push({
      id: "bulk-behind",
      title: `${kcalLeft} kcal left to grow`,
      body: "Bulking fails from under-eating, not over-logging. Add rice, olive oil, whole milk, or a banana-oat shake before bed.",
      actionLabel: "Add a snack",
      href: "/log",
      meal: "snack",
      tone: "coach",
      category: "calories",
    });
  } else if (kcalLeft > 0 && kcalLeft < 180 && ctx.mealsLogged > 0) {
    tips.push({
      id: "close-calories",
      title: "You are in the scoring window",
      body: `${kcalLeft} kcal left. A piece of fruit, a yogurt, or stopping now all count as a hit if you land near target.`,
      tone: "win",
      category: "calories",
    });
  }

  if (waterR < 0.4 && ctx.hour >= 13) {
    tips.push({
      id: "water-low",
      title: `${waterLeft} ml of water left`,
      body: "Thirst often shows up as snack cravings. Drink 250–500 ml now, then reassess hunger in 10 minutes.",
      tone: "alert",
      category: "water",
    });
  } else if (waterR >= 1) {
    tips.push({
      id: "water-hit",
      title: "Hydration locked",
      body: "Water target is hit. Keep sipping around training, but you already earned the water bonus.",
      tone: "win",
      category: "water",
    });
  }

  if (ctx.streak === 0 && ctx.hour >= 19 && ctx.mealsLogged === 0) {
    tips.push({
      id: "save-streak",
      title: "Save tonight's streak",
      body: "One logged meal keeps the chain alive. Quick-add whatever you actually ate — accuracy can be cleaned up later.",
      actionLabel: "Quick add",
      href: "/log",
      tone: "alert",
      category: "habit",
    });
  } else if (ctx.streak >= 2 && ctx.mealsLogged > 0) {
    tips.push({
      id: "streak-live",
      title: `${ctx.streak}-day streak is live`,
      body: "Do not break the chain for a 'messy' day. Logging the real number is the habit.",
      tone: "win",
      category: "habit",
    });
  }

  tips.push(bmiTip(bmi.category, ctx.goalType, bmi.value));
  tips.push(rotate(goalLibrary(ctx.goalType), ctx.date + ctx.goalType));
  tips.push(rotate(habitLibrary(), ctx.date));

  const seen = new Set<string>();
  return tips.filter((tip) => {
    if (seen.has(tip.id)) return false;
    seen.add(tip.id);
    return true;
  });
}

function bmiTip(category: BmiCategory, goal: GoalType, value: number): Tip {
  if (category === "underweight") {
    return {
      id: "bmi-under",
      title: `BMI ${value} — eat on purpose`,
      body: "Prioritize calorie-dense meals you can repeat: oats, rice, nut butters, whole eggs, and a shake if meals are small.",
      tone: "coach",
      category: "bmi",
    };
  }
  if (category === "overweight" || category === "obese") {
    return {
      id: "bmi-over",
      title: `BMI ${value} — volume over restriction`,
      body:
        goal === "lose"
          ? "Fill the plate with protein and vegetables first. High volume keeps hunger quiet without needing a crash diet."
          : "Even on a bulk or recomp, keep 80% of meals whole-food. Surplus works better when it is not all ultra-processed.",
      tone: "coach",
      category: "bmi",
    };
  }
  return {
    id: "bmi-healthy",
    title: `BMI ${value} is in a healthy band`,
    body: "Protect it with protein, sleep, and a weekly weigh-in — not daily scale panic. BMI is a guide, not a verdict.",
    tone: "win",
    category: "bmi",
  };
}

function goalLibrary(goal: GoalType): Tip[] {
  const name = GOAL_LABEL[goal];
  if (goal === "lose") {
    return [
      {
        id: "cut-fiber",
        title: `${name} tip: double the fiber`,
        body: "Berries, beans, oats, and broccoli slow digestion. That is how a deficit feels like a meal, not a punishment.",
        tone: "coach",
        category: "goal",
      },
      {
        id: "cut-steps",
        title: `${name} tip: walk after meals`,
        body: "A 10-minute walk after lunch and dinner improves glucose handling and adds easy expenditure without extra gym time.",
        tone: "coach",
        category: "goal",
      },
      {
        id: "cut-weekend",
        title: `${name} tip: plan the weekend`,
        body: "Decide breakfast and a protein anchor before Saturday starts. Most cuts break on unplanned afternoons, not weekdays.",
        tone: "coach",
        category: "goal",
      },
    ];
  }
  if (goal === "gain") {
    return [
      {
        id: "bulk-liquid",
        title: `${name} tip: drink some calories`,
        body: "When appetite dies, liquids win: milk, smoothies, or yogurt bowls. Chewing every surplus calorie is optional.",
        tone: "coach",
        category: "goal",
      },
      {
        id: "bulk-progressive",
        title: `${name} tip: surplus needs lifts`,
        body: "A bulk without progressive overload is just a surplus. Hit protein, sleep 7+ hours, and add a little load each week.",
        tone: "coach",
        category: "goal",
      },
    ];
  }
  if (goal === "recomp") {
    return [
      {
        id: "recomp-protein",
        title: `${name} tip: never miss protein`,
        body: "Recomp is slow on purpose. The lever is high protein plus hard training, not a huge deficit or surplus.",
        tone: "coach",
        category: "goal",
      },
      {
        id: "recomp-patience",
        title: `${name} tip: trust the weekly trend`,
        body: "Weight can bounce 1–2 kg from salt and carbs. Use weekly averages and photos, not a single morning number.",
        tone: "coach",
        category: "goal",
      },
    ];
  }
  return [
    {
      id: "hold-repeat",
      title: `${name} tip: repeat winning meals`,
      body: "Maintenance is a playlist, not a new album every day. Keep 3–4 default meals you can log in seconds.",
      tone: "coach",
      category: "goal",
    },
    {
      id: "hold-sleep",
      title: `${name} tip: sleep is a macro`,
      body: "Short sleep raises hunger hormones and wrecks training. Guard a consistent bedtime the way you guard protein.",
      tone: "coach",
      category: "goal",
    },
  ];
}

function habitLibrary(): Tip[] {
  return [
    {
      id: "habit-scan",
      title: "Photo now, edit later",
      body: "If you are out, scan the plate. You can fix grams when you get home — the memory of the meal fades fast.",
      actionLabel: "Open scanner",
      href: "/scan",
      tone: "coach",
      category: "habit",
    },
    {
      id: "habit-scale",
      title: "Same scale, same morning",
      body: "Weigh after the bathroom, before breakfast, 2–4 times a week. The ritual matters more than the decimal.",
      actionLabel: "Log weigh-in",
      href: "/progress",
      tone: "coach",
      category: "habit",
    },
    {
      id: "habit-salt",
      title: "Sodium swings the scale",
      body: "A salty dinner can add a kilo of water overnight. That is not fat. Stay the course for 3–4 days before changing calories.",
      tone: "coach",
      category: "habit",
    },
    {
      id: "habit-veggies",
      title: "Color on every plate",
      body: "A fist of vegetables at lunch and dinner covers a lot of micronutrients without another supplement stack.",
      tone: "coach",
      category: "habit",
    },
  ];
}

function capitalize(value: string): string {
  return value.slice(0, 1).toUpperCase() + value.slice(1);
}
