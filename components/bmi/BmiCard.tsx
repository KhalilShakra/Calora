"use client";

import { Card } from "@/components/ui";
import { bmiMeterPct, computeBmiResult, type BmiCategory } from "@/lib/bmi";
import { cn } from "@/lib/cn";

const TONE: Record<BmiCategory, string> = {
  underweight: "text-ff-accent",
  healthy: "text-ff-primary",
  overweight: "text-ff-warning",
  obese: "text-ff-danger",
};

export function BmiCard({
  weightKg,
  heightCm,
  compact = false,
}: {
  weightKg: number;
  heightCm: number;
  compact?: boolean;
}) {
  const bmi = computeBmiResult(weightKg, heightCm);
  if (!weightKg || !heightCm) return null;

  return (
    <Card className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-ff-dim">BMI</p>
          <p className="font-display text-3xl font-semibold leading-none">{bmi.value}</p>
        </div>
        <p className={cn("text-sm font-semibold", TONE[bmi.category])}>{bmi.label}</p>
      </div>
      <div className="relative h-2 rounded-full">
        <div className="flex h-full overflow-hidden rounded-full">
          <span className="w-[14%] bg-ff-accent/70" />
          <span className="w-[26%] bg-ff-primary/80" />
          <span className="w-[20%] bg-ff-warning/80" />
          <span className="flex-1 bg-ff-danger/80" />
        </div>
        <div
          className="absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full border-2 border-ff-bg bg-ff-text"
          style={{ left: `calc(${bmiMeterPct(bmi.value)}% - 7px)` }}
          aria-hidden
        />
      </div>
      {!compact && (
        <p className="text-xs text-ff-dim">
          Healthy range for {heightCm} cm: {bmi.healthyMinKg}–{bmi.healthyMaxKg} kg
        </p>
      )}
    </Card>
  );
}
