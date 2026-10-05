"use client";

import { cn } from "@/lib/cn";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-ff border border-ff-border bg-ff-surface p-4",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function Button({
  children,
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger" | "soft";
}) {
  const styles = {
    primary: "bg-ff-primary text-[var(--ff-on-primary)] hover:brightness-110",
    ghost: "bg-transparent text-ff-text border border-ff-border hover:bg-ff-muted",
    danger: "bg-ff-danger text-white",
    soft: "bg-ff-muted text-ff-text hover:brightness-110",
  }[variant];
  return (
    <button
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold transition disabled:opacity-50",
        styles,
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="block space-y-1.5">
      <span className="text-xs font-medium uppercase tracking-wide text-ff-dim">{label}</span>
      {children}
    </div>
  );
}

const control =
  "w-full rounded-ff border border-ff-border bg-ff-muted px-3 py-2.5 text-ff-text outline-none focus:border-ff-primary";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(control, props.className)} {...props} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(control, props.className)} {...props} />;
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <div className="grid auto-cols-fr grid-flow-col gap-1 rounded-full bg-ff-muted p-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "rounded-full px-2 py-2 text-xs font-semibold",
            value === opt.value ? "bg-ff-primary text-[var(--ff-on-primary)]" : "text-ff-dim",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
