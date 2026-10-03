/**
 * ForgeFuel — Brand tokens
 * Dark-first health + habit-loop gamification.
 * Map these 1:1 to Tailwind theme.extend and CSS variables.
 */

export const APP_NAME = "ForgeFuel";
export const APP_TAGLINE = "Earn your fuel. Level your life.";

export const brandAlternatives = [
  { name: "NutriQuest", tagline: "Every meal is a quest." },
  { name: "MacroForge", tagline: "Forge your macros. Keep the streak." },
  { name: "Calora", tagline: "Smart tracking. Daily rewards." },
  { name: "VitaLoop", tagline: "Close the loop. Win the day." },
] as const;

export const dark = {
  bg: "#0B1220",
  bgElevated: "#111827",
  surface: "#151C2C",
  surfaceMuted: "#1C2436",
  border: "#243044",
  text: "#F8FAFC",
  textMuted: "#94A3B8",
  primary: "#10B981",
  primaryHover: "#34D399",
  primaryPressed: "#059669",
  accent: "#22D3EE",
  warning: "#F59E0B",
  danger: "#F43F5E",
  success: "#34D399",
} as const;

export const light = {
  bg: "#F4F7F5",
  bgElevated: "#FFFFFF",
  surface: "#FFFFFF",
  surfaceMuted: "#E8EEEA",
  border: "#D6DED8",
  text: "#0F172A",
  textMuted: "#475569",
  primary: "#059669",
  primaryHover: "#10B981",
  primaryPressed: "#047857",
  accent: "#0891B2",
  warning: "#D97706",
  danger: "#E11D48",
  success: "#059669",
} as const;

/** Macro / tracker semantic colors — same hue family in both themes. */
export const macros = {
  calories: "#F59E0B",
  protein: "#60A5FA",
  carbs: "#FBBF24",
  fats: "#F472B6",
  water: "#38BDF8",
  micros: "#A78BFA",
  xp: "#A3E635",
  streak: "#FB7185",
} as const;

export const tiers = {
  bronze: "#B45309",
  silver: "#94A3B8",
  gold: "#EAB308",
  platinum: "#67E8F9",
} as const;

export const radius = {
  sm: 10,
  md: 16,
  lg: 24,
  pill: 999,
} as const;

export const cssVariables = `
:root {
  color-scheme: dark;
  --ff-bg: ${dark.bg};
  --ff-bg-elevated: ${dark.bgElevated};
  --ff-surface: ${dark.surface};
  --ff-surface-muted: ${dark.surfaceMuted};
  --ff-border: ${dark.border};
  --ff-text: ${dark.text};
  --ff-text-muted: ${dark.textMuted};
  --ff-primary: ${dark.primary};
  --ff-accent: ${dark.accent};
  --ff-warning: ${dark.warning};
  --ff-danger: ${dark.danger};
  --ff-cal: ${macros.calories};
  --ff-pro: ${macros.protein};
  --ff-carb: ${macros.carbs};
  --ff-fat: ${macros.fats};
  --ff-water: ${macros.water};
  --ff-xp: ${macros.xp};
  --ff-radius-md: ${radius.md}px;
}

[data-theme="light"] {
  color-scheme: light;
  --ff-bg: ${light.bg};
  --ff-bg-elevated: ${light.bgElevated};
  --ff-surface: ${light.surface};
  --ff-surface-muted: ${light.surfaceMuted};
  --ff-border: ${light.border};
  --ff-text: ${light.text};
  --ff-text-muted: ${light.textMuted};
  --ff-primary: ${light.primary};
  --ff-accent: ${light.accent};
  --ff-warning: ${light.warning};
  --ff-danger: ${light.danger};
}
`;
