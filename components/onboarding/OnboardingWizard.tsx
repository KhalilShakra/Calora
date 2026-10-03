"use client";

import { BmiCard } from "@/components/bmi/BmiCard";
import { completeOnboarding } from "@/lib/actions";
import { computeBmiResult } from "@/lib/bmi";
import { computeTdeePlan } from "@/lib/tdee";
import { cmToFtIn, ftInToCm, kgToLb, lbToKg } from "@/lib/units";
import { Button, Field, Input, Segmented, Select } from "@/components/ui";
import type { ActivityLevel, GoalType, Sex, UnitSystem } from "@/types";
import { APP_NAME, APP_TAGLINE } from "@/design/brand";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

const ACTIVITY: Array<{ value: ActivityLevel; label: string; hint: string }> = [
  { value: "sedentary", label: "Desk", hint: "Mostly sitting" },
  { value: "light", label: "Light", hint: "1–3 workouts" },
  { value: "moderate", label: "Steady", hint: "3–5 workouts" },
  { value: "active", label: "High", hint: "6–7 hard days" },
  { value: "very_active", label: "Athlete", hint: "Twice a day" },
];

const GOALS: Array<{ value: GoalType; label: string; hint: string }> = [
  { value: "lose", label: "Cut", hint: "Calorie deficit" },
  { value: "gain", label: "Bulk", hint: "Muscle surplus" },
  { value: "maintain", label: "Hold", hint: "Stay the course" },
  { value: "recomp", label: "Recomp", hint: "Lean + dense" },
];

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [sex, setSex] = useState<Sex>("male");
  const [units, setUnits] = useState<UnitSystem>("metric");
  const [dateOfBirth, setDateOfBirth] = useState("1996-01-15");
  const [heightCm, setHeightCm] = useState(178);
  const [weightKg, setWeightKg] = useState(78);
  const [targetWeightKg, setTargetWeightKg] = useState(74);
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>("moderate");
  const [goalType, setGoalType] = useState<GoalType>("lose");

  const plan = useMemo(
    () =>
      computeTdeePlan({
        sex,
        weightKg,
        heightCm,
        dateOfBirth,
        activityLevel,
        goalType,
      }),
    [sex, weightKg, heightCm, dateOfBirth, activityLevel, goalType],
  );
  const bmi = useMemo(() => computeBmiResult(weightKg, heightCm), [weightKg, heightCm]);
  const targetBmi = useMemo(
    () => computeBmiResult(targetWeightKg, heightCm),
    [targetWeightKg, heightCm],
  );

  async function finish() {
    setBusy(true);
    try {
      await completeOnboarding({
        displayName,
        dateOfBirth,
        sex,
        heightCm,
        currentWeightKg: weightKg,
        activityLevel,
        goalType,
        targetWeightKg,
        units,
      });
      router.replace("/");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[80dvh] max-w-md flex-col gap-6">
      <header className="pt-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ff-primary">
          {APP_NAME}
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold">{APP_TAGLINE}</h1>
        <p className="mt-2 text-sm text-ff-dim">Step {step + 1} of 4</p>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-ff-muted">
          <div
            className="h-full bg-ff-primary transition-all"
            style={{ width: `${((step + 1) / 4) * 100}%` }}
          />
        </div>
      </header>

      {step === 0 && (
        <div className="space-y-4">
          <Field label="What should we call you?">
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Alex"
              autoFocus
            />
          </Field>
          <Field label="Units">
            <Segmented
              value={units}
              onChange={setUnits}
              options={[
                { value: "metric", label: "Metric" },
                { value: "imperial", label: "Imperial" },
              ]}
            />
          </Field>
          <Field label="Sex (for TDEE)">
            <Segmented
              value={sex}
              onChange={setSex}
              options={[
                { value: "male", label: "Male" },
                { value: "female", label: "Female" },
                { value: "other", label: "Other" },
              ]}
            />
          </Field>
          <Field label="Birthday">
            <Input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
          </Field>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          {units === "metric" ? (
            <>
              <Field label="Height (cm)">
                <Input
                  type="number"
                  min={120}
                  max={230}
                  value={heightCm}
                  onChange={(e) => setHeightCm(Number(e.target.value))}
                />
              </Field>
              <Field label="Current weight (kg)">
                <Input
                  type="number"
                  min={35}
                  max={250}
                  step="0.1"
                  value={weightKg}
                  onChange={(e) => setWeightKg(Number(e.target.value))}
                />
              </Field>
              <Field label="Target weight (kg)">
                <Input
                  type="number"
                  min={35}
                  max={250}
                  step="0.1"
                  value={targetWeightKg}
                  onChange={(e) => setTargetWeightKg(Number(e.target.value))}
                />
              </Field>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Height (ft)">
                  <Input
                    type="number"
                    min={4}
                    max={8}
                    value={cmToFtIn(heightCm).ft}
                    onChange={(e) =>
                      setHeightCm(ftInToCm(Number(e.target.value), cmToFtIn(heightCm).inch))
                    }
                  />
                </Field>
                <Field label="Height (in)">
                  <Input
                    type="number"
                    min={0}
                    max={11}
                    value={cmToFtIn(heightCm).inch}
                    onChange={(e) =>
                      setHeightCm(ftInToCm(cmToFtIn(heightCm).ft, Number(e.target.value)))
                    }
                  />
                </Field>
              </div>
              <Field label="Current weight (lb)">
                <Input
                  type="number"
                  min={80}
                  max={550}
                  step="0.1"
                  value={kgToLb(weightKg)}
                  onChange={(e) => setWeightKg(lbToKg(Number(e.target.value)))}
                />
              </Field>
              <Field label="Target weight (lb)">
                <Input
                  type="number"
                  min={80}
                  max={550}
                  step="0.1"
                  value={kgToLb(targetWeightKg)}
                  onChange={(e) => setTargetWeightKg(lbToKg(Number(e.target.value)))}
                />
              </Field>
            </>
          )}
          <BmiCard weightKg={weightKg} heightCm={heightCm} />
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <p className="text-sm text-ff-dim">How hard do you train in a typical week?</p>
          {ACTIVITY.map((a) => (
            <button
              key={a.value}
              type="button"
              onClick={() => setActivityLevel(a.value)}
              className={`flex w-full items-center justify-between rounded-ff border px-4 py-3 text-left ${
                activityLevel === a.value
                  ? "border-ff-primary bg-ff-muted"
                  : "border-ff-border bg-ff-surface"
              }`}
            >
              <span className="font-semibold">{a.label}</span>
              <span className="text-sm text-ff-dim">{a.hint}</span>
            </button>
          ))}
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <Field label="Your forge">
            <Select value={goalType} onChange={(e) => setGoalType(e.target.value as GoalType)}>
              {GOALS.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label} — {g.hint}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Stat label="BMR" value={`${plan.bmr}`} unit="kcal" />
            <Stat label="TDEE" value={`${plan.tdee}`} unit="kcal" />
            <Stat label="Daily target" value={`${plan.calorieTarget}`} unit="kcal" accent />
            <Stat label="Water" value={`${plan.waterMlTarget}`} unit="ml" />
            <Stat label="Protein" value={`${plan.proteinG}`} unit="g" />
            <Stat label="Carbs" value={`${plan.carbsG}`} unit="g" />
            <Stat label="Fats" value={`${plan.fatG}`} unit="g" />
            <Stat label="BMI" value={`${bmi.value}`} unit={bmi.label} accent />
            <Stat label="Target BMI" value={`${targetBmi.value}`} unit={targetBmi.label} />
          </div>
          <p className="text-xs text-ff-dim">
            Mifflin-St Jeor + activity multiplier. Cut −500, bulk +350, recomp −150. BMI uses WHO
            adult bands. You can edit later.
          </p>
        </div>
      )}

      <div className="mt-auto flex gap-2 pb-4">
        {step > 0 && (
          <Button variant="ghost" className="flex-1" onClick={() => setStep((s) => s - 1)}>
            Back
          </Button>
        )}
        {step < 3 ? (
          <Button className="flex-1" onClick={() => setStep((s) => s + 1)}>
            Continue
          </Button>
        ) : (
          <Button className="flex-1" disabled={busy} onClick={finish}>
            {busy ? "Forging…" : "Start tracking"}
          </Button>
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  unit,
  accent,
}: {
  label: string;
  value: string;
  unit: string;
  accent?: boolean;
}) {
  return (
    <div className={`rounded-ff border border-ff-border p-3 ${accent ? "bg-ff-muted" : "bg-ff-surface"}`}>
      <p className="text-[11px] uppercase tracking-wide text-ff-dim">{label}</p>
      <p className="font-display text-xl font-semibold">
        {value} <span className="text-xs font-medium text-ff-dim">{unit}</span>
      </p>
    </div>
  );
}
