"use client";

export function MacroBar({
  label,
  actual,
  target,
  color,
  unit = "g",
}: {
  label: string;
  actual: number;
  target: number;
  color: string;
  unit?: string;
}) {
  const pct = target > 0 ? Math.min(100, (actual / target) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-ff-dim">
          {Math.round(actual)}
          {unit} / {target}
          {unit}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-ff-muted">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}
