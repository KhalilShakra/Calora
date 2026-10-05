"use client";

import { useT } from "@/lib/i18n";

export function CalorieRing({
  eaten,
  target,
}: {
  eaten: number;
  target: number;
}) {
  const t = useT();
  const over = target > 0 && eaten > target;
  const pct = target > 0 ? Math.min(1, eaten / target) : 0;
  const color = over ? "var(--ff-danger)" : "var(--ff-ring-progress)";
  const cx = 60;
  const cy = 60;
  const radius = 42;
  const stroke = 16;
  const start = -Math.PI / 2;
  const end = start + pct * Math.PI * 2;
  const x1 = cx + radius * Math.cos(start);
  const y1 = cy + radius * Math.sin(start);
  const x2 = cx + radius * Math.cos(end);
  const y2 = cy + radius * Math.sin(end);
  const large = pct > 0.5 ? 1 : 0;

  return (
    <div className="relative mx-auto grid h-[15.5rem] w-[15.5rem] place-items-center">
      <svg viewBox="0 0 120 120" className="absolute inset-0 overflow-visible" aria-hidden>
        <circle cx={cx} cy={cy} r={radius} stroke="var(--ff-ring-track)" strokeWidth={stroke} fill="none" />
        {pct >= 1 ? (
          <circle cx={cx} cy={cy} r={radius} stroke={color} strokeWidth={stroke} fill="none" />
        ) : pct > 0 ? (
          <path
            d={`M ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2}`}
            stroke={color}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
          />
        ) : null}
        {pct > 0 && pct < 1 && (
          <>
            <circle cx={x2} cy={y2} r={stroke / 2 + 1} fill={color} />
            <circle cx={x2} cy={y2} r={stroke * 0.22} fill="var(--ff-surface)" />
          </>
        )}
      </svg>
      <div className="relative text-center">
        <p className="font-display text-[1.55rem] font-semibold leading-none tracking-tight tabular-nums">
          <span className={over ? "text-ff-danger" : undefined}>{Math.round(eaten)}</span>
          <span className="text-[0.95rem] font-medium text-ff-dim">/{Math.round(target)}</span>
        </p>
        <p className="mt-1 text-xs text-ff-dim">{t("dash.calories")}</p>
      </div>
    </div>
  );
}
