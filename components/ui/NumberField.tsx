"use client";

import { Input } from "@/components/ui";
import { cn } from "@/lib/cn";
import { t } from "@/lib/i18n";
import { useEffect, useRef, useState, type InputHTMLAttributes } from "react";

/** Allow a cleared field and a single 0. Strip extras like 078 → 78, keep 0.5. */
export function normalizeNumberDraft(raw: string, allowDecimal: boolean): string | null {
  if (raw === "") return "";
  const pattern = allowDecimal ? /^\d*\.?\d*$/ : /^\d*$/;
  if (!pattern.test(raw)) return null;

  const dot = raw.indexOf(".");
  if (dot === -1) {
    const stripped = raw.replace(/^0+(?=\d)/, "");
    return stripped === "" ? "0" : stripped;
  }

  const intRaw = raw.slice(0, dot);
  const frac = raw.slice(dot + 1);
  if (intRaw === "") return `.${frac}`;
  const intPart = intRaw.replace(/^0+(?=\d)/, "") || "0";
  return `${intPart}.${frac}`;
}

function outOfRangeMessage(value: number, min: number | null, max: number | null): string | null {
  const below = min != null && Number.isFinite(min) && value < min;
  const above = max != null && Number.isFinite(max) && value > max;
  if (below && above) return t("num.invalid");
  if (below && max != null && Number.isFinite(max)) return t("num.range", { min: min ?? "", max });
  if (above && min != null && Number.isFinite(min)) return t("num.range", { min, max: max ?? "" });
  if (below) return t("num.min", { min: min ?? "" });
  if (above) return t("num.max", { max: max ?? "" });
  return null;
}

export function parseCommittedNumber(raw: string): number | null {
  if (raw === "" || raw === ".") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

type NumberFieldProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "type" | "inputMode"
> & {
  value: number;
  onValueChange: (value: number) => void;
  /** False while the field is empty, not a number, or outside min/max. */
  onValidityChange?: (valid: boolean) => void;
  allowDecimal?: boolean;
  error?: string | null;
};

export function NumberField({
  value,
  onValueChange,
  onValidityChange,
  allowDecimal = true,
  error,
  className,
  onBlur,
  onFocus,
  ...rest
}: NumberFieldProps) {
  const [text, setText] = useState(() => (Number.isFinite(value) ? String(value) : ""));
  const [focused, setFocused] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const committed = useRef(value);

  useEffect(() => {
    if (focused || Object.is(value, committed.current)) return;
    committed.current = value;
    setLocalError(null);
    setText(Number.isFinite(value) ? String(value) : "");
    onValidityChange?.(true);
  }, [value, focused, onValidityChange]);

  const shown = error || localError;

  return (
    <div className="w-full">
      <Input
        {...rest}
        type="text"
        inputMode={allowDecimal ? "decimal" : "numeric"}
        autoComplete="off"
        aria-invalid={shown ? true : undefined}
        className={cn(className)}
        value={text}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onChange={(e) => {
          const next = normalizeNumberDraft(e.target.value.replace(",", "."), allowDecimal);
          if (next === null) return;
          setText(next);
          const parsed = parseCommittedNumber(next);
          if (parsed === null) {
            setLocalError(null);
            onValidityChange?.(false);
            return;
          }
          const minN = rest.min == null || rest.min === "" ? null : Number(rest.min);
          const maxN = rest.max == null || rest.max === "" ? null : Number(rest.max);
          const inRange =
            (minN == null || !Number.isFinite(minN) || parsed >= minN) &&
            (maxN == null || !Number.isFinite(maxN) || parsed <= maxN);
          const rangeError = inRange ? null : outOfRangeMessage(parsed, minN, maxN);
          setLocalError(rangeError);
          committed.current = parsed;
          onValidityChange?.(inRange);
          onValueChange(parsed);
        }}
        onBlur={(e) => {
          setFocused(false);
          const parsed = parseCommittedNumber(text);
          if (parsed === null) {
            setLocalError(t("num.enter"));
            onValidityChange?.(false);
          } else {
            const minN = rest.min == null || rest.min === "" ? null : Number(rest.min);
            const maxN = rest.max == null || rest.max === "" ? null : Number(rest.max);
            const rangeError = outOfRangeMessage(parsed, minN, maxN);
            committed.current = parsed;
            setText(String(parsed));
            setLocalError(rangeError);
            onValidityChange?.(rangeError == null);
            onValueChange(parsed);
          }
          onBlur?.(e);
        }}
      />
      {shown ? <p className="mt-1 text-xs font-medium text-ff-danger">{shown}</p> : null}
    </div>
  );
}
