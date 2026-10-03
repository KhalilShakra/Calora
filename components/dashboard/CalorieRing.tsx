"use client";

import type { CSSProperties } from "react";

export function CalorieRing({
  eaten,
  target,
}: {
  eaten: number;
  target: number;
}) {
  const pct = target > 0 ? Math.min(100, Math.round((eaten / target) * 100)) : 0;
  const remaining = Math.round(target - eaten);
  return (
    <div className="relative mx-auto grid h-52 w-52 place-items-center">
      <div
        className="ff-ring absolute inset-0 rounded-full"
        style={
          {
            "--ring-pct": pct,
            "--ring-color": remaining < 0 ? "var(--ff-danger)" : "var(--ff-primary)",
          } as CSSProperties
        }
      />
      <div className="absolute inset-3 rounded-full bg-ff-bg" />
      <div className="relative text-center">
        <p className="font-display text-4xl font-semibold leading-none">{Math.round(eaten)}</p>
        <p className="mt-1 text-xs uppercase tracking-wider text-ff-dim">
          / {target} kcal
        </p>
        <p className="mt-2 text-sm font-medium text-ff-primary">
          {remaining >= 0 ? `${remaining} left` : `${Math.abs(remaining)} over`}
        </p>
      </div>
    </div>
  );
}
