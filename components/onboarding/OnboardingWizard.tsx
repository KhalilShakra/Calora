"use client";

import { BmiCard } from "@/components/bmi/BmiCard";
import { Button, Field, Input } from "@/components/ui";
import { NumberField } from "@/components/ui/NumberField";
import { APP_NAME } from "@/design/brand";
import { useT, type MessageKey } from "@/lib/i18n";
import { completeOnboarding } from "@/lib/actions";
import { ageFromDob } from "@/lib/dates";
import { computeTdeePlan, type MacroFocus, type Pace } from "@/lib/tdee";
import { kgToLb, lbToKg } from "@/lib/units";
import type { ActivityLevel, GoalType, Sex, UnitSystem } from "@/types";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";

const STEPS = [
  "welcome",
  "goal",
  "training",
  "pace",
  "focus",
  "sex",
  "identity",
  "units",
  "body",
] as const;

type StepId = (typeof STEPS)[number];

type Choice<T extends string> = { value: T; label: MessageKey; hint: MessageKey };

const ACTIVITY: Choice<ActivityLevel>[] = [
  { value: "sedentary", label: "onb.act.sedentary", hint: "onb.act.sedentaryHint" },
  { value: "light", label: "onb.act.light", hint: "onb.act.lightHint" },
  { value: "moderate", label: "onb.act.moderate", hint: "onb.act.moderateHint" },
  { value: "active", label: "onb.act.active", hint: "onb.act.activeHint" },
  { value: "very_active", label: "onb.act.very_active", hint: "onb.act.very_activeHint" },
];

const GOALS: Choice<GoalType>[] = [
  { value: "lose", label: "onb.goal.lose", hint: "onb.goal.loseHint" },
  { value: "gain", label: "onb.goal.gain", hint: "onb.goal.gainHint" },
  { value: "maintain", label: "onb.goal.maintain", hint: "onb.goal.maintainHint" },
  { value: "recomp", label: "onb.goal.recomp", hint: "onb.goal.recompHint" },
];

const PACES: Choice<Pace>[] = [
  { value: "gentle", label: "onb.pace.gentle", hint: "onb.pace.gentleHint" },
  { value: "steady", label: "onb.pace.steady", hint: "onb.pace.steadyHint" },
  { value: "fast", label: "onb.pace.fast", hint: "onb.pace.fastHint" },
];

const FOCUSES: Choice<MacroFocus>[] = [
  { value: "protein", label: "onb.focus.protein", hint: "onb.focus.proteinHint" },
  { value: "simple", label: "onb.focus.simple", hint: "onb.focus.simpleHint" },
];

const SEXES: Choice<Sex>[] = [
  { value: "female", label: "onb.sex.female", hint: "onb.sex.femaleHint" },
  { value: "male", label: "onb.sex.male", hint: "onb.sex.maleHint" },
  { value: "other", label: "onb.sex.other", hint: "onb.sex.otherHint" },
];

const PROMPTS: Record<Exclude<StepId, "welcome">, { title: MessageKey; body: MessageKey }> = {
  goal: { title: "onb.goal.title", body: "onb.goal.body" },
  training: { title: "onb.training.title", body: "onb.training.body" },
  pace: { title: "onb.pace.title", body: "onb.pace.body" },
  focus: { title: "onb.focus.title", body: "onb.focus.body" },
  sex: { title: "onb.sex.title", body: "onb.sex.body" },
  identity: { title: "onb.identity.title", body: "onb.identity.body" },
  units: { title: "onb.units.title", body: "onb.units.body" },
  body: { title: "onb.body.title", body: "onb.body.body" },
};

export function OnboardingWizard() {
  const router = useRouter();
  const tr = useT();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [sex, setSex] = useState<Sex | null>(null);
  const [units, setUnits] = useState<UnitSystem | null>(null);
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [heightCm, setHeightCm] = useState(178);
  const [weightKg, setWeightKg] = useState(78);
  const [targetWeightKg, setTargetWeightKg] = useState(74);
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | null>(null);
  const [goalType, setGoalType] = useState<GoalType | null>(null);
  const [pace, setPace] = useState<Pace | null>(null);
  const [macroFocus, setMacroFocus] = useState<MacroFocus | null>(null);
  const bodyValid = useRef({ height: true, weight: true, target: true });

  const stepId = STEPS[step] ?? "welcome";
  const progressTotal = STEPS.length - 1;
  const weightUnit = units === "imperial" ? "lbs" : "kg";

  const plan = useMemo(() => {
    if (!sex || !goalType || !activityLevel || !pace || !macroFocus || !dateOfBirth) return null;
    return computeTdeePlan({
      sex,
      weightKg,
      heightCm,
      dateOfBirth,
      activityLevel,
      goalType,
      pace,
      macroFocus,
    });
  }, [sex, weightKg, heightCm, dateOfBirth, activityLevel, goalType, pace, macroFocus]);

  function statsReady() {
    return (
      bodyValid.current.height &&
      bodyValid.current.weight &&
      bodyValid.current.target &&
      heightCm > 0 &&
      weightKg > 0 &&
      targetWeightKg > 0
    );
  }

  function identityError(): MessageKey | null {
    if (!displayName.trim()) return "onb.err.name";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) return "onb.err.birthday";
    const age = ageFromDob(dateOfBirth);
    if (!Number.isFinite(age) || age < 13 || age > 100) {
      return "onb.err.age";
    }
    return null;
  }

  function validateStep(): MessageKey | null {
    if (stepId === "goal" && !goalType) return "onb.err.goal";
    if (stepId === "training" && !activityLevel) return "onb.err.training";
    if (stepId === "pace" && !pace) return "onb.err.pace";
    if (stepId === "focus" && !macroFocus) return "onb.err.focus";
    if (stepId === "sex" && !sex) return "onb.err.sex";
    if (stepId === "identity") return identityError();
    if (stepId === "units" && !units) return "onb.err.units";
    if (stepId === "body" && !statsReady()) return "onb.err.body";
    return null;
  }

  async function finish() {
    const error = validateStep();
    if (error || !goalType || !activityLevel || !pace || !macroFocus || !sex || !units) {
      setFormError(error ? tr(error) : tr("onb.err.answer"));
      return;
    }
    setBusy(true);
    setFormError(null);
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
        pace,
        macroFocus,
      });
      router.replace("/");
      router.refresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : tr("onb.err.save"));
    } finally {
      setBusy(false);
    }
  }

  function continueStep() {
    const error = validateStep();
    if (error) {
      setFormError(tr(error));
      return;
    }
    setFormError(null);
    if (stepId === "body") {
      void finish();
      return;
    }
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
  }

  if (stepId === "welcome") {
    return (
      <div className="mx-auto flex min-h-[80dvh] max-w-md flex-col">
        <div className="flex flex-1 flex-col items-center justify-center px-2 text-center">
          <img
            src="/icon.svg"
            alt=""
            className="h-32 w-32 rounded-[28px] shadow-glow"
          />
          <p className="mt-8 text-xs font-semibold uppercase tracking-[0.22em] text-ff-primary">
            {APP_NAME}
          </p>
          <h1 className="mt-3 font-display text-4xl font-semibold leading-tight">{tr("tagline")}</h1>
          <p className="mt-3 max-w-[18rem] text-sm text-ff-dim">{tr("onb.welcomeBody")}</p>
        </div>
        <Button className="mb-4 w-full" onClick={() => setStep(1)}>
          {tr("onb.getStarted")}
        </Button>
      </div>
    );
  }

  const prompt = PROMPTS[stepId];

  return (
    <div className="mx-auto flex min-h-[80dvh] max-w-md flex-col gap-6">
      <header className="pt-2">
        <img src="/icon.svg" alt="" className="mb-3 h-12 w-12" />
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ff-primary">{APP_NAME}</p>
        <p className="mt-2 text-sm text-ff-dim">
          {tr("onb.step", { step, total: progressTotal })}
        </p>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-ff-muted">
          <div
            className="h-full bg-ff-primary transition-all"
            style={{ width: `${(step / progressTotal) * 100}%` }}
          />
        </div>
      </header>

      <div className="space-y-3">
        <h1 className="font-display text-3xl font-semibold leading-tight">{tr(prompt.title)}</h1>
        <p className="text-sm text-ff-dim">{tr(prompt.body)}</p>
      </div>

      {stepId === "goal" && (
        <ChoiceList
          options={localize(GOALS, tr)}
          value={goalType}
          onChange={(value) => {
            setGoalType(value);
            setFormError(null);
          }}
        />
      )}

      {stepId === "training" && (
        <ChoiceList
          options={localize(ACTIVITY, tr)}
          value={activityLevel}
          onChange={(value) => {
            setActivityLevel(value);
            setFormError(null);
          }}
        />
      )}

      {stepId === "pace" && (
        <ChoiceList
          options={localize(PACES, tr)}
          value={pace}
          onChange={(value) => {
            setPace(value);
            setFormError(null);
          }}
        />
      )}

      {stepId === "focus" && (
        <ChoiceList
          options={localize(FOCUSES, tr)}
          value={macroFocus}
          onChange={(value) => {
            setMacroFocus(value);
            setFormError(null);
          }}
        />
      )}

      {stepId === "sex" && (
        <ChoiceList
          options={localize(SEXES, tr)}
          value={sex}
          onChange={(value) => {
            setSex(value);
            setFormError(null);
          }}
        />
      )}

      {stepId === "identity" && (
        <div className="space-y-4">
          <Field label={tr("onb.name")}>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={tr("onb.namePh")}
              autoComplete="name"
              aria-label={tr("onb.ariaName")}
              autoFocus
            />
          </Field>
          <Field label={tr("onb.birthday")}>
            <Input
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              aria-label={tr("onb.ariaBirthday")}
              autoComplete="bday"
            />
          </Field>
        </div>
      )}

      {stepId === "units" && (
        <ChoiceList
          options={localize(
            [
              { value: "metric" as const, label: "onb.kg" as const, hint: "onb.kgHint" as const },
              { value: "imperial" as const, label: "onb.lbs" as const, hint: "onb.lbsHint" as const },
            ],
            tr,
          )}
          value={units}
          onChange={(next) => {
            bodyValid.current = { height: true, weight: true, target: true };
            setUnits(next);
            setFormError(null);
          }}
        />
      )}

      {stepId === "body" && units && (
        <div className="space-y-4">
          <Field label={tr("onb.height")}>
            <NumberField
              aria-label={tr("onb.ariaHeight")}
              min={120}
              max={230}
              value={heightCm}
              onValueChange={setHeightCm}
              onValidityChange={(ok) => {
                bodyValid.current.height = ok;
              }}
            />
          </Field>
          <Field label={tr("onb.currentWeight", { unit: weightUnit })}>
            <NumberField
              key={`weight-${units}`}
              aria-label={tr("onb.ariaWeight")}
              min={units === "metric" ? 35 : 80}
              max={units === "metric" ? 250 : 550}
              value={units === "metric" ? weightKg : kgToLb(weightKg)}
              onValueChange={(value) => setWeightKg(units === "metric" ? value : lbToKg(value))}
              onValidityChange={(ok) => {
                bodyValid.current.weight = ok;
              }}
            />
          </Field>
          <Field label={tr("onb.targetWeight", { unit: weightUnit })}>
            <NumberField
              key={`target-${units}`}
              aria-label={tr("onb.ariaTarget")}
              min={units === "metric" ? 35 : 80}
              max={units === "metric" ? 250 : 550}
              value={units === "metric" ? targetWeightKg : kgToLb(targetWeightKg)}
              onValueChange={(value) =>
                setTargetWeightKg(units === "metric" ? value : lbToKg(value))
              }
              onValidityChange={(ok) => {
                bodyValid.current.target = ok;
              }}
            />
          </Field>
          <BmiCard weightKg={weightKg} heightCm={heightCm} />
          {plan && (
            <p className="text-sm text-ff-dim">
              {tr("onb.dailyTarget")}{" "}
              <span className="font-semibold text-ff-text">{plan.calorieTarget} kcal</span>
            </p>
          )}
        </div>
      )}

      {formError && <p className="text-sm font-medium text-ff-danger">{formError}</p>}

      <div className="mt-auto flex gap-2 pb-4">
        <Button
          variant="ghost"
          className="flex-1"
          onClick={() => {
            setFormError(null);
            setStep((current) => Math.max(0, current - 1));
          }}
        >
          {tr("onb.back")}
        </Button>
        <Button className="flex-1" disabled={busy} onClick={continueStep}>
          {stepId === "body" ? (busy ? tr("onb.saving") : tr("onb.continueDevice")) : tr("onb.continue")}
        </Button>
      </div>
    </div>
  );
}

function localize<T extends string>(
  rows: Choice<T>[],
  tr: (key: MessageKey) => string,
): Array<{ value: T; label: string; hint: string }> {
  return rows.map((row) => ({ value: row.value, label: tr(row.label), hint: tr(row.hint) }));
}

function ChoiceList<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<{ value: T; label: string; hint: string }>;
  value: T | null;
  onChange: (value: T) => void;
}) {
  return (
    <div className="space-y-3">
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`flex w-full items-center justify-between gap-3 rounded-ff border px-4 py-3 text-left ${
              selected ? "border-ff-primary bg-ff-muted" : "border-ff-border bg-ff-surface"
            }`}
          >
            <span className="font-semibold">{option.label}</span>
            <span className="text-right text-sm text-ff-dim">{option.hint}</span>
          </button>
        );
      })}
    </div>
  );
}
