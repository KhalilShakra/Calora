"use client";

import { Card } from "@/components/ui";
import { bmiMeterPct, computeBmiResult, type BmiCategory } from "@/lib/bmi";
import { cn } from "@/lib/cn";
import { useT, type MessageKey } from "@/lib/i18n";
import type { CSSProperties } from "react";

const BANDS: Array<{ category: BmiCategory; labelKey: MessageKey; dot: string }> = [
  { category: "underweight", labelKey: "bmi.under", dot: "#3b82f6" },
  { category: "healthy", labelKey: "bmi.healthy", dot: "#22c55e" },
  { category: "overweight", labelKey: "bmi.over", dot: "#f97316" },
  { category: "obese", labelKey: "bmi.obese", dot: "#ef4444" },
];

/** Color zones follow the 15–40 meter scale (WHO cuts at 18.5, 25, and 30). */
const METER =
  "linear-gradient(90deg, #3b82f6 0%, #3b82f6 12%, #22c55e 18%, #4ade80 32%, #84cc16 38%, #eab308 46%, #f59e0b 54%, #f97316 58%, #ef4444 66%, #dc2626 100%)";

const PILL: Record<BmiCategory, { className: string; style: CSSProperties }> = {
  underweight: {
    className: "text-[#93c5fd] [[data-theme=light]_&]:text-[#1d4ed8]",
    style: { background: "color-mix(in srgb, #3b82f6 16%, transparent)" },
  },
  healthy: {
    className: "text-ff-primary",
    style: { background: "color-mix(in srgb, var(--ff-primary) 16%, transparent)" },
  },
  overweight: {
    className: "text-ff-warning",
    style: { background: "color-mix(in srgb, var(--ff-warning) 16%, transparent)" },
  },
  obese: {
    className: "text-ff-danger",
    style: { background: "color-mix(in srgb, var(--ff-danger) 16%, transparent)" },
  },
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
  const t = useT();
  const bmi = computeBmiResult(weightKg, heightCm);
  if (!weightKg || !heightCm) return null;

  const pct = bmiMeterPct(bmi.value);
  const pill = PILL[bmi.category];
  const categoryLabel = t(BANDS.find((band) => band.category === bmi.category)?.labelKey ?? "bmi.healthy");

  return (
    <Card className="space-y-3">
      <div className="space-y-2">
        <p className="font-semibold">{t("bmi.title")}</p>
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <p className="font-display text-[2rem] font-semibold leading-none tracking-tight">{bmi.value}</p>
          <p className="flex items-center gap-1.5 text-sm text-ff-dim">
            <span>{t("bmi.weightIs")}</span>
            <span
              className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", pill.className)}
              style={pill.style}
            >
              {categoryLabel}
            </span>
          </p>
        </div>
      </div>

      <div className="relative py-1" role="img" aria-label={t("bmi.aria", { value: bmi.value, label: categoryLabel })}>
        <div className="h-2.5 rounded-full" style={{ background: METER }} data-bmi-meter="" />
        <div
          className="pointer-events-none absolute top-1/2 h-4 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.35)]"
          style={{ left: `clamp(2px, ${pct}%, calc(100% - 2px))` }}
          data-bmi-marker=""
          aria-hidden
        />
      </div>

      <ul className="flex justify-between gap-1 text-[11px] leading-none text-ff-dim">
        {BANDS.map((band) => (
          <li key={band.category} className="flex min-w-0 items-center gap-1 whitespace-nowrap">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: band.dot }} aria-hidden />
            {t(band.labelKey)}
          </li>
        ))}
      </ul>

      {!compact && (
        <p className="text-xs text-ff-dim">
          {t("bmi.range", { height: heightCm, min: bmi.healthyMinKg, max: bmi.healthyMaxKg })}
        </p>
      )}
    </Card>
  );
}
