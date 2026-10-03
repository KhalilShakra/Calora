import type { Tier } from "@/types";

export function levelFromXp(xp: number): number {
  return Math.max(1, 1 + Math.floor(Math.max(0, xp) / 500));
}

export function tierFromLevel(level: number): Tier {
  if (level >= 40) return "platinum";
  if (level >= 25) return "gold";
  if (level >= 10) return "silver";
  return "bronze";
}

export function xpIntoLevel(xp: number): { current: number; needed: number; ratio: number } {
  const level = levelFromXp(xp);
  const floor = (level - 1) * 500;
  const current = xp - floor;
  return { current, needed: 500, ratio: Math.min(1, current / 500) };
}
