"use client";

import { addMeal, deleteMeal, saveCustomFood, saveRecipe } from "@/lib/actions";
import { db } from "@/lib/db";
import { Button, Card, Field, Input, Segmented } from "@/components/ui";
import { useUserId } from "@/store/useAuth";
import { useUi } from "@/store/useUi";
import type { MealType } from "@/types";
import { MEALS } from "@/types";
import { useLiveQuery } from "dexie-react-hooks";
import { Trash2 } from "lucide-react";
import { useState } from "react";

type Tab = "quick" | "custom" | "recipe";

export function Logger() {
  const date = useUi((s) => s.selectedDate);
  const meal = useUi((s) => s.selectedMeal);
  const setMeal = useUi((s) => s.setMeal);
  const showToast = useUi((s) => s.showToast);
  const [tab, setTab] = useState<Tab>("quick");
  const userId = useUserId();
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

  return (
    <div className="space-y-4">
      <header>
        <h1 className="font-display text-2xl font-semibold">Logger</h1>
        <p className="text-sm text-ff-dim">Quick add, custom foods, and recipes.</p>
      </header>

      <Segmented
        value={meal}
        onChange={setMeal}
        options={MEALS.map((m) => ({ value: m, label: m[0].toUpperCase() + m.slice(1) }))}
      />

      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: "quick", label: "Quick" },
          { value: "custom", label: "Food" },
          { value: "recipe", label: "Recipe" },
        ]}
      />

      {tab === "quick" && (
        <QuickForm
          meal={meal}
          date={date}
          onSaved={() => showToast("Logged · +10 XP")}
        />
      )}
      {tab === "custom" && (
        <CustomForm
          foods={customFoods ?? []}
          meal={meal}
          date={date}
          onSaved={() => showToast("Food saved and logged")}
        />
      )}
      {tab === "recipe" && (
        <RecipeForm
          recipes={recipes ?? []}
          meal={meal}
          date={date}
          onSaved={() => showToast("Recipe logged")}
        />
      )}

      <div className="space-y-3">
        {(groups ?? []).map((g) => (
          <Card key={g.log.id}>
            <div className="mb-2 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase text-ff-dim">{g.log.mealType}</p>
                <p className="font-semibold capitalize">{g.log.source.replace("_", " ")}</p>
              </div>
              <button
                type="button"
                aria-label="Delete meal"
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
  onSaved,
}: {
  meal: MealType;
  date: string;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [calories, setCalories] = useState(400);
  const [protein, setProtein] = useState(30);
  const [carbs, setCarbs] = useState(40);
  const [fat, setFat] = useState(12);
  const [grams, setGrams] = useState(250);

  return (
    <Card className="space-y-3">
      <Field label="Name">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Chicken bowl" />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Grams">
          <Input type="number" value={grams} onChange={(e) => setGrams(Number(e.target.value))} />
        </Field>
        <Field label="Calories">
          <Input type="number" value={calories} onChange={(e) => setCalories(Number(e.target.value))} />
        </Field>
        <Field label="Protein">
          <Input type="number" value={protein} onChange={(e) => setProtein(Number(e.target.value))} />
        </Field>
        <Field label="Carbs">
          <Input type="number" value={carbs} onChange={(e) => setCarbs(Number(e.target.value))} />
        </Field>
        <Field label="Fats">
          <Input type="number" value={fat} onChange={(e) => setFat(Number(e.target.value))} />
        </Field>
      </div>
      <Button
        className="w-full"
        onClick={async () => {
          if (!name.trim()) return;
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
        }}
      >
        Quick add
      </Button>
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
        <p className="text-sm font-semibold">Create food (per serving)</p>
        <Field label="Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Greek yogurt" />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Serving g">
            <Input type="number" value={grams} onChange={(e) => setGrams(Number(e.target.value))} />
          </Field>
          <Field label="Calories">
            <Input type="number" value={calories} onChange={(e) => setCalories(Number(e.target.value))} />
          </Field>
          <Field label="P">
            <Input type="number" value={protein} onChange={(e) => setProtein(Number(e.target.value))} />
          </Field>
          <Field label="C">
            <Input type="number" value={carbs} onChange={(e) => setCarbs(Number(e.target.value))} />
          </Field>
          <Field label="F">
            <Input type="number" value={fat} onChange={(e) => setFat(Number(e.target.value))} />
          </Field>
        </div>
        <Button
          className="w-full"
          onClick={async () => {
            if (!name.trim()) return;
            const id = await saveCustomFood({
              name: name.trim(),
              servingLabel: "1 serving",
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
          Save & log
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

  async function logRecipe(id: string) {
    const ings = await db.recipeIngredients.where("recipeId").equals(id).toArray();
    const recipe = recipes.find((r) => r.id === id);
    if (!recipe || ings.length === 0) return;
    await addMeal({
      localDate: date,
      mealType: meal,
      source: "recipe",
      items: ings.map((ing) => ({
        name: `${recipe.name}: ${ing.name}`,
        grams: ing.grams / recipe.servings,
        calories: ing.calories / recipe.servings,
        proteinG: ing.proteinG / recipe.servings,
        carbsG: ing.carbsG / recipe.servings,
        fatG: ing.fatG / recipe.servings,
        recipeId: id,
      })),
    });
    onSaved();
  }

  return (
    <div className="space-y-3">
      <Card className="space-y-3">
        <p className="text-sm font-semibold">Build a recipe</p>
        <Field label="Recipe name">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Sunday chili" />
        </Field>
        <Field label="Servings">
          <Input type="number" min={1} value={servings} onChange={(e) => setServings(Number(e.target.value))} />
        </Field>
        <Field label="Ingredient line">
          <Input
            value={line}
            onChange={(e) => setLine(e.target.value)}
            placeholder="Name 150g 200kcal 20P 10C 8F"
          />
        </Field>
        <Button
          className="w-full"
          onClick={async () => {
            const parsed = parseIngredientLine(line);
            if (!name.trim() || !parsed) return;
            const id = await saveRecipe(name.trim(), servings, [parsed]);
            await logRecipe(id);
            setName("");
          }}
        >
          Save recipe & log 1 serving
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
          <span className="text-xs text-ff-dim">{recipe.servings} servings</span>
        </button>
      ))}
    </div>
  );
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
