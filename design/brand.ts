/**
 * Calora — Brand tokens
 * Dark-first health + habit-loop gamification.
 * Map these 1:1 to Tailwind theme.extend and CSS variables.
 */

export const APP_NAME = "Calora";
export const APP_TAGLINE = "Track food. Feel better.";

export const brandAlternatives = [
  { name: "NutriQuest", tagline: "Every meal is a quest." },
  { name: "MacroForge", tagline: "Forge your macros. Keep the streak." },
  { name: "Calora", tagline: "Smart tracking. Daily rewards." },
  { name: "VitaLoop", tagline: "Close the loop. Win the day." },
] as const;

export const dark = {
  canvas: "#060C09",
  bg: "#0C1410",
  bgElevated: "#141C16",
  surface: "#182119",
  surfaceMuted: "#243028",
  border: "#2F3C31",
  text: "#F4F7F2",
  textMuted: "#9AA394",
  primary: "#C6F531",
  primaryHover: "#D4FA62",
  primaryPressed: "#A8D61A",
  accent: "#8B7CF6",
  warning: "#F5B942",
  danger: "#FF5D73",
  success: "#C6F531",
} as const;

export const light = {
  canvas: "#D6E2CA",
  bg: "#E4ECD8",
  bgElevated: "#F3F6EC",
  surface: "#F8FAF4",
  surfaceMuted: "#D5E1C4",
  border: "#CDD8C2",
  text: "#141614",
  textMuted: "#6B726A",
  primary: "#C6F531",
  primaryHover: "#D4FA62",
  primaryPressed: "#A8D61A",
  accent: "#5C8F12",
  warning: "#D97706",
  danger: "#E11D48",
  success: "#C6F531",
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
  --ff-canvas: ${dark.canvas};
  --ff-bg: ${dark.bg};
  --ff-bg-elevated: ${dark.bgElevated};
  --ff-surface: ${dark.surface};
  --ff-surface-muted: ${dark.surfaceMuted};
  --ff-border: ${dark.border};
  --ff-text: ${dark.text};
  --ff-text-muted: ${dark.textMuted};
  --ff-primary: ${dark.primary};
  --ff-on-primary: #101410;
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
  --ff-canvas: ${light.canvas};
  --ff-bg: ${light.bg};
  --ff-bg-elevated: ${light.bgElevated};
  --ff-surface: ${light.surface};
  --ff-surface-muted: ${light.surfaceMuted};
  --ff-border: ${light.border};
  --ff-text: ${light.text};
  --ff-text-muted: ${light.textMuted};
  --ff-primary: ${light.primary};
  --ff-on-primary: #101410;
  --ff-accent: ${light.accent};
  --ff-warning: ${light.warning};
  --ff-danger: ${light.danger};
}
`;
