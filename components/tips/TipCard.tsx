"use client";

import { Card } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { Tip } from "@/lib/tips";
import { useUi } from "@/store/useUi";
import { Lightbulb, Siren, Sparkles } from "lucide-react";
import Link from "next/link";

const ICONS = {
  coach: Lightbulb,
  alert: Siren,
  win: Sparkles,
};

export function TipCard({
  tip,
  featured = false,
}: {
  tip: Tip;
  featured?: boolean;
}) {
  const setMeal = useUi((s) => s.setMeal);
  const Icon = ICONS[tip.tone];
  const action = tip.href ? (
    <Link
      href={tip.href}
      onClick={() => {
        if (tip.meal) setMeal(tip.meal);
      }}
      className="inline-flex min-h-10 items-center justify-center rounded-full bg-ff-primary px-4 text-sm font-semibold text-slate-950"
    >
      {tip.actionLabel ?? "Open"}
    </Link>
  ) : null;

  return (
    <Card
      className={cn(
        "space-y-2",
        tip.tone === "alert" && "border-ff-warning/50",
        tip.tone === "win" && "border-ff-primary/40",
        featured && "shadow-glow",
      )}
    >
      <div className="flex items-start gap-2">
        <Icon
          size={18}
          className={cn(
            "mt-0.5 shrink-0",
            tip.tone === "alert" && "text-ff-warning",
            tip.tone === "win" && "text-ff-xp",
            tip.tone === "coach" && "text-ff-accent",
          )}
        />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] uppercase tracking-wide text-ff-dim">{tip.category}</p>
          <h3 className="font-display text-lg font-semibold leading-snug">{tip.title}</h3>
          <p className="mt-1 text-sm text-ff-dim">{tip.body}</p>
        </div>
      </div>
      {action && <div className="pt-1">{action}</div>}
    </Card>
  );
}

export function RemainingChips({
  proteinLeft,
  kcalLeft,
  waterLeft,
}: {
  proteinLeft: number;
  kcalLeft: number;
  waterLeft: number;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <Chip label="Calories" value={kcalLeft >= 0 ? `${kcalLeft} left` : `${Math.abs(kcalLeft)} over`} />
      <Chip label="Protein" value={`${Math.max(0, proteinLeft)}g left`} />
      <Chip label="Water" value={`${Math.max(0, Math.round(waterLeft / 50) * 50)}ml`} />
    </div>
  );
}

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-ff border border-ff-border bg-ff-muted px-2 py-2 text-center">
      <p className="text-[10px] uppercase tracking-wide text-ff-dim">{label}</p>
      <p className="text-xs font-semibold">{value}</p>
    </div>
  );
}

export function TipsDisclaimer() {
  return (
    <p className="text-[11px] leading-relaxed text-ff-dim">
      Tips are general coaching, not medical advice. Talk to a clinician before big diet or training
      changes.
    </p>
  );
}
