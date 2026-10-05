"use client";

import { addMeal, deleteMeal, saveCustomFood, saveRecipe } from "@/lib/actions";
import { db } from "@/lib/db";
import { MEAL_KEY, SOURCE_KEY, useT } from "@/lib/i18n";
import { NumberField } from "@/components/ui/NumberField";
import { Button, Card, Field, Input, Segmented } from "@/components/ui";
import { useUserId } from "@/store/useAuth";
import { useUi } from "@/store/useUi";
import type { MealType } from "@/types";
import { MEALS } from "@/types";
import { useLiveQuery } from "dexie-react-hooks";
import { Trash2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Tab = "quick" | "custom" | "recipe";

export function Logger() {
  const date = useUi((s) => s.selectedDate);
  const meal = useUi((s) => s.selectedMeal);
  const setMeal = useUi((s) => s.setMeal);
  const showToast = useUi((s) => s.showToast);
  const [tab, setTab] = useState<Tab>("quick");
  const mealQuery = useSearchParams().get("meal");
  const userId = useUserId();
  const tr = useT();

  useEffect(() => {
    if (mealQuery && MEALS.includes(mealQuery as MealType)) setMeal(mealQuery as MealType);
  }, [mealQuery, setMeal]);
  const groups = useLiveQuery(async () => {
    const headers = await db.foodLogs.where("[userId+localDate]").equals([userId, date]).toArray();
    const rows = await Promise.all(
      headers.map((h) => db.foodLogItems.where("foodLogId").equals(h.id).toArray()),
    );
    return headers.map((h, i) => ({ log: h, items: rows[i] }));
  }, [userId, date]);
  const customFoods = useLiveQuery(
    () => db.customFoods.where("userId").equals(userId).sortBy("name"),
    [userId],
  );
  const recipes = useLiveQuery(
    () => db.recipes.where("userId").equals(userId).sortBy("name"),
    [userId],
  );
  const recentFoods = useLiveQuery(async () => {
    const logs = await db.foodLogs.where("userId").equals(userId).toArray();
    const newest = logs.sort((a, b) => b.loggedAt.localeCompare(a.loggedAt)).slice(0, 30);
    const rows = await Promise.all(
      newest.map((log) => db.foodLogItems.where("foodLogId").equals(log.id).toArray()),
    );
    const seen = new Set<string>();
    const hits: RecentFood[] = [];
    for (const items of rows) {
      for (const item of items) {
        const key = item.name.trim().toLowerCase();
        if (!key || seen.has(key)) continue;
        seen.add(key);
        hits.push({
          name: item.name,
          grams: item.grams,
          calories: item.calories,
          proteinG: item.proteinG,
          carbsG: item.carbsG,
          fatG: item.fatG,
        });
        if (hits.length >= 20) return hits;
      }
    }
    return hits;
  }, [userId]);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="font-display text-2xl font-semibold">{tr("log.title")}</h1>
        <p className="text-sm text-ff-dim">{tr("log.subtitle")}</p>
      </header>

      <Segmented
        value={meal}
        onChange={setMeal}
        options={MEALS.map((m) => ({ value: m, label: tr(MEAL_KEY[m]) }))}
      />

      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: "quick", label: tr("log.quick") },
          { value: "custom", label: tr("log.food") },
          { value: "recipe", label: tr("log.recipe") },
        ]}
      />

      {tab === "quick" && (
        <QuickForm
          meal={meal}
          date={date}
          foods={customFoods ?? []}
          recipes={recipes ?? []}
          recent={recentFoods ?? []}
          onSaved={() => showToast(tr("log.toastLogged"))}
        />
      )}
      {tab === "custom" && (
        <CustomForm
          foods={customFoods ?? []}
          meal={meal}
          date={date}
          onSaved={() => showToast(tr("log.toastFood"))}
        />
      )}
      {tab === "recipe" && (
        <RecipeForm
          recipes={recipes ?? []}
          meal={meal}
          date={date}
          onSaved={() => showToast(tr("log.toastRecipe"))}
        />
      )}

      <div className="space-y-3">
        {orderedLogs(groups).map((g) => (
          <Card key={g.log.id}>
            <div className="mb-2 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase text-ff-dim">{tr(MEAL_KEY[g.log.mealType])}</p>
                <p className="font-semibold">{tr(SOURCE_KEY[g.log.source])}</p>
              </div>
              <button
                type="button"
                aria-label={tr("log.deleteMeal")}
                onClick={() => deleteMeal(g.log.id, date)}
                className="text-ff-danger"
              >
                <Trash2 size={16} />
              </button>
            </div>
            <ul className="space-y-1 text-sm">
              {g.items.map((item) => (
                <li key={item.id} className="flex justify-between">
                  <span>
                    {item.name}{" "}
                    <span className="text-ff-dim">{item.grams}g</span>
                  </span>
                  <span>{Math.round(item.calories)}</span>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </div>
  );
}

function QuickForm({
  meal,
  date,
  foods,
  recipes,
  recent,
  onSaved,
}: {
  meal: MealType;
  date: string;
  foods: Array<{
    id: string;
    name: string;
    servingSizeG: number;
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
  }>;
  recipes: Array<{ id: string; name: string }>;
  recent: RecentFood[];
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [calories, setCalories] = useState(400);
  const [protein, setProtein] = useState(30);
  const [carbs, setCarbs] = useState(40);
  const [fat, setFat] = useState(12);
  const [grams, setGrams] = useState(250);
  const [formError, setFormError] = useState<string | null>(null);
  const valid = useRef({ grams: true, calories: true, protein: true, carbs: true, fat: true });
  const tr = useT();
  const query = name.trim().toLowerCase();
  const hits = query ? matchingFoods(query, foods, recipes, recent, tr) : [];

  async function saveManual() {
    if (!name.trim()) return;
    if (!Object.values(valid.current).every(Boolean) || !(grams > 0)) {
      setFormError(tr("log.errMacros"));
      return;
    }
    setFormError(null);
    await addMeal({
      localDate: date,
      mealType: meal,
      source: "quick_add",
      items: [
        {
          name: name.trim(),
          grams,
          calories,
          proteinG: protein,
          carbsG: carbs,
          fatG: fat,
        },
      ],
    });
    setName("");
    onSaved();
  }

  async function logHit(hit: FoodHit) {
    if (hit.kind === "recipe") {
      const ok = await logRecipeServing(hit.id, meal, date);
      if (!ok) return;
    } else {
      await addMeal({
        localDate: date,
        mealType: meal,
        source: hit.kind === "food" ? "custom_food" : "quick_add",
        items: [
          {
            name: hit.name,
            grams: hit.grams,
            calories: hit.calories,
            proteinG: hit.proteinG,
            carbsG: hit.carbsG,
            fatG: hit.fatG,
            customFoodId: hit.kind === "food" ? hit.id : undefined,
          },
        ],
      });
    }
    setName("");
    onSaved();
  }

  return (
    <Card>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          void saveManual();
        }}
      >
      <Field label={tr("log.name")}>
        <Input
          value={name}
          autoFocus
          onChange={(e) => setName(e.target.value)}
          placeholder={tr("log.search")}
        />
      </Field>
      {hits.length > 0 && (
        <div className="space-y-2">
          {hits.map((hit) => (
            <button
              key={hit.key}
              type="button"
              onClick={() => void logHit(hit)}
              className="flex w-full items-center justify-between rounded-ff border border-ff-border bg-ff-surface px-4 py-3 text-left"
            >
              <span>
                <span className="block font-medium">{hit.name}</span>
                <span className="text-xs text-ff-dim">{hit.detail}</span>
              </span>
              <span className="text-sm text-ff-dim">{hit.kcal}</span>
            </button>
          ))}
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        <Field label={tr("log.grams")}>
          <NumberField
            value={grams}
            onValueChange={setGrams}
            onValidityChange={(ok) => {
              valid.current.grams = ok;
            }}
          />
        </Field>
        <Field label={tr("log.calories")}>
          <NumberField
            value={calories}
            onValueChange={setCalories}
            onValidityChange={(ok) => {
              valid.current.calories = ok;
            }}
          />
        </Field>
        <Field label={tr("log.protein")}>
          <NumberField
            value={protein}
            onValueChange={setProtein}
            onValidityChange={(ok) => {
              valid.current.protein = ok;
            }}
          />
        </Field>
        <Field label={tr("log.carbs")}>
          <NumberField
            value={carbs}
            onValueChange={setCarbs}
            onValidityChange={(ok) => {
              valid.current.carbs = ok;
            }}
          />
        </Field>
        <Field label={tr("log.fats")}>
          <NumberField
            value={fat}
            onValueChange={setFat}
            onValidityChange={(ok) => {
              valid.current.fat = ok;
            }}
          />
        </Field>
      </div>
      {formError && <p className="text-xs font-medium text-ff-danger">{formError}</p>}
      <Button className="w-full" type="submit" disabled={!name.trim()}>
        {tr("log.quickAdd")}
      </Button>
      </form>
    </Card>
  );
}

function CustomForm({
  foods,
  meal,
  date,
  onSaved,
}: {
  foods: Array<{
    id: string;
    name: string;
    servingSizeG: number;
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
    servingLabel: string;
  }>;
  meal: MealType;
  date: string;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [calories, setCalories] = useState(200);
  const [protein, setProtein] = useState(20);
  const [carbs, setCarbs] = useState(10);
  const [fat, setFat] = useState(8);
  const [grams, setGrams] = useState(100);
  const [formError, setFormError] = useState<string | null>(null);
  const valid = useRef({ grams: true, calories: true, protein: true, carbs: true, fat: true });
  const tr = useT();

  async function logExisting(id: string) {
    const food = foods.find((f) => f.id === id);
    if (!food) return;
    await addMeal({
      localDate: date,
      mealType: meal,
      source: "custom_food",
      items: [
        {
          name: food.name,
          grams: food.servingSizeG,
          calories: food.calories,
          proteinG: food.proteinG,
          carbsG: food.carbsG,
          fatG: food.fatG,
          customFoodId: food.id,
        },
      ],
    });
    onSaved();
  }

  return (
    <div className="space-y-3">
      <Card className="space-y-3">
        <p className="text-sm font-semibold">{tr("log.createFood")}</p>
        <Field label={tr("log.name")}>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={tr("log.foodPh")} />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label={tr("log.servingG")}>
            <NumberField
              value={grams}
              onValueChange={setGrams}
              onValidityChange={(ok) => {
                valid.current.grams = ok;
              }}
            />
          </Field>
          <Field label={tr("log.calories")}>
            <NumberField
              value={calories}
              onValueChange={setCalories}
              onValidityChange={(ok) => {
                valid.current.calories = ok;
              }}
            />
          </Field>
          <Field label={tr("log.p")}>
            <NumberField
              value={protein}
              onValueChange={setProtein}
              onValidityChange={(ok) => {
                valid.current.protein = ok;
              }}
            />
          </Field>
          <Field label={tr("log.c")}>
            <NumberField
              value={carbs}
              onValueChange={setCarbs}
              onValidityChange={(ok) => {
                valid.current.carbs = ok;
              }}
            />
          </Field>
          <Field label={tr("log.f")}>
            <NumberField
              value={fat}
              onValueChange={setFat}
              onValidityChange={(ok) => {
                valid.current.fat = ok;
              }}
            />
          </Field>
        </div>
        {formError && <p className="text-xs font-medium text-ff-danger">{formError}</p>}
        <Button
          className="w-full"
          onClick={async () => {
            if (!name.trim()) return;
            if (!Object.values(valid.current).every(Boolean) || !(grams > 0)) {
              setFormError(tr("log.errServing"));
              return;
            }
            setFormError(null);
            const id = await saveCustomFood({
              name: name.trim(),
              servingLabel: tr("log.oneServing"),
              servingSizeG: grams,
              calories,
              proteinG: protein,
              carbsG: carbs,
              fatG: fat,
              micros: {},
            });
            await addMeal({
              localDate: date,
              mealType: meal,
              source: "custom_food",
              items: [
                {
                  name: name.trim(),
                  grams,
                  calories,
                  proteinG: protein,
                  carbsG: carbs,
                  fatG: fat,
                  customFoodId: id,
                },
              ],
            });
            setName("");
            onSaved();
          }}
        >
          {tr("log.saveLog")}
        </Button>
      </Card>
      {foods.map((food) => (
        <button
          key={food.id}
          type="button"
          onClick={() => logExisting(food.id)}
          className="flex w-full items-center justify-between rounded-ff border border-ff-border bg-ff-surface px-4 py-3 text-left"
        >
          <span>
            <span className="block font-medium">{food.name}</span>
            <span className="text-xs text-ff-dim">{food.servingSizeG}g · {food.servingLabel}</span>
          </span>
          <span className="text-sm text-ff-dim">{Math.round(food.calories)} kcal</span>
        </button>
      ))}
    </div>
  );
}

function RecipeForm({
  recipes,
  meal,
  date,
  onSaved,
}: {
  recipes: Array<{ id: string; name: string; servings: number }>;
  meal: MealType;
  date: string;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [servings, setServings] = useState(2);
  const [line, setLine] = useState("Chicken 200g 330kcal 62P 0C 7F");
  const [formError, setFormError] = useState<string | null>(null);
  const servingsValid = useRef(true);
  const tr = useT();

  async function logRecipe(id: string, snapshot?: { name: string; servings: number }) {
    const ok = await logRecipeServing(id, meal, date, snapshot);
    if (ok) onSaved();
  }

  return (
    <div className="space-y-3">
      <Card className="space-y-3">
        <p className="text-sm font-semibold">{tr("log.buildRecipe")}</p>
        <Field label={tr("log.recipeName")}>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={tr("log.recipePh")} />
        </Field>
        <Field label={tr("log.servings")}>
          <NumberField
            value={servings}
            onValueChange={setServings}
            onValidityChange={(ok) => {
              servingsValid.current = ok;
            }}
          />
        </Field>
        <Field label={tr("log.ingredient")}>
          <Input
            value={line}
            onChange={(e) => setLine(e.target.value)}
            placeholder={tr("log.ingredientPh")}
          />
        </Field>
        {formError && <p className="text-xs font-medium text-ff-danger">{formError}</p>}
        <Button
          className="w-full"
          onClick={async () => {
            const parsed = parseIngredientLine(line);
            if (!name.trim() || !parsed) return;
            if (!servingsValid.current || !(servings > 0)) {
              setFormError(tr("log.errServings"));
              return;
            }
            setFormError(null);
            const savedName = name.trim();
            const savedServings = servings;
            const id = await saveRecipe(savedName, savedServings, [parsed]);
            await logRecipe(id, { name: savedName, servings: savedServings });
            setName("");
          }}
        >
          {tr("log.saveRecipe")}
        </Button>
      </Card>
      {recipes.map((recipe) => (
        <button
          key={recipe.id}
          type="button"
          onClick={() => logRecipe(recipe.id)}
          className="flex w-full items-center justify-between rounded-ff border border-ff-border bg-ff-surface px-4 py-3"
        >
          <span className="font-medium">{recipe.name}</span>
          <span className="text-xs text-ff-dim">{tr("log.servingsCount", { n: recipe.servings })}</span>
        </button>
      ))}
    </div>
  );
}

type RecentFood = {
  name: string;
  grams: number;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

type FoodHit = {
  key: string;
  kind: "food" | "recent" | "recipe";
  id: string;
  name: string;
  detail: string;
  kcal: string;
  grams: number;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

function orderedLogs<T extends { log: { mealType: MealType; loggedAt: string } }>(
  groups: T[] | undefined,
): T[] {
  const mealOrder = new Map(MEALS.map((meal, index) => [meal, index]));
  return [...(groups ?? [])].sort((a, b) => {
    const mealDelta = (mealOrder.get(a.log.mealType) ?? 0) - (mealOrder.get(b.log.mealType) ?? 0);
    if (mealDelta !== 0) return mealDelta;
    return a.log.loggedAt.localeCompare(b.log.loggedAt);
  });
}

function matchingFoods(
  query: string,
  foods: Array<{
    id: string;
    name: string;
    servingSizeG: number;
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
  }>,
  recipes: Array<{ id: string; name: string }>,
  recent: RecentFood[],
  tr: (key: "log.savedFood" | "log.kcal" | "log.recipeHit" | "log.add" | "log.loggedBefore", vars?: Record<string, string | number>) => string,
): FoodHit[] {
  const hits: FoodHit[] = [];
  const seen = new Set<string>();
  for (const food of foods) {
    if (!food.name.toLowerCase().includes(query)) continue;
    seen.add(food.name.trim().toLowerCase());
    hits.push({
      key: `food-${food.id}`,
      kind: "food",
      id: food.id,
      name: food.name,
      detail: tr("log.savedFood", { g: food.servingSizeG }),
      kcal: tr("log.kcal", { n: Math.round(food.calories) }),
      grams: food.servingSizeG,
      calories: food.calories,
      proteinG: food.proteinG,
      carbsG: food.carbsG,
      fatG: food.fatG,
    });
  }
  for (const recipe of recipes) {
    if (!recipe.name.toLowerCase().includes(query)) continue;
    seen.add(recipe.name.trim().toLowerCase());
    hits.push({
      key: `recipe-${recipe.id}`,
      kind: "recipe",
      id: recipe.id,
      name: recipe.name,
      detail: tr("log.recipeHit"),
      kcal: tr("log.add"),
      grams: 0,
      calories: 0,
      proteinG: 0,
      carbsG: 0,
      fatG: 0,
    });
  }
  for (const item of recent) {
    const key = item.name.trim().toLowerCase();
    if (!key.includes(query) || seen.has(key)) continue;
    seen.add(key);
    hits.push({
      key: `recent-${key}`,
      kind: "recent",
      id: "",
      name: item.name,
      detail: tr("log.loggedBefore", { g: Math.round(item.grams) }),
      kcal: tr("log.kcal", { n: Math.round(item.calories) }),
      grams: item.grams,
      calories: item.calories,
      proteinG: item.proteinG,
      carbsG: item.carbsG,
      fatG: item.fatG,
    });
  }
  return hits.slice(0, 5);
}

async function logRecipeServing(
  id: string,
  meal: MealType,
  date: string,
  snapshot?: { name: string; servings: number },
): Promise<boolean> {
  const ings = await db.recipeIngredients.where("recipeId").equals(id).toArray();
  const stored = snapshot ?? (await db.recipes.get(id));
  if (!stored || !(stored.servings > 0) || ings.length === 0) return false;
  await addMeal({
    localDate: date,
    mealType: meal,
    source: "recipe",
    items: ings.map((ing) => ({
      name: `${stored.name}: ${ing.name}`,
      grams: ing.grams / stored.servings,
      calories: ing.calories / stored.servings,
      proteinG: ing.proteinG / stored.servings,
      carbsG: ing.carbsG / stored.servings,
      fatG: ing.fatG / stored.servings,
      recipeId: id,
    })),
  });
  return true;
}

function parseIngredientLine(line: string) {
  const match = line.match(
    /(.+?)\s+(\d+(?:\.\d+)?)g\s+(\d+(?:\.\d+)?)kcal\s+(\d+(?:\.\d+)?)P\s+(\d+(?:\.\d+)?)C\s+(\d+(?:\.\d+)?)F/i,
  );
  if (!match) return null;
  return {
    name: match[1].trim(),
    grams: Number(match[2]),
    calories: Number(match[3]),
    proteinG: Number(match[4]),
    carbsG: Number(match[5]),
    fatG: Number(match[6]),
  };
}
