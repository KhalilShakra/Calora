import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ff: {
          bg: "var(--ff-bg)",
          elevated: "var(--ff-bg-elevated)",
          surface: "var(--ff-surface)",
          muted: "var(--ff-surface-muted)",
          border: "var(--ff-border)",
          text: "var(--ff-text)",
          dim: "var(--ff-text-muted)",
          primary: "var(--ff-primary)",
          accent: "var(--ff-accent)",
          warning: "var(--ff-warning)",
          danger: "var(--ff-danger)",
          cal: "var(--ff-cal)",
          pro: "var(--ff-pro)",
          carb: "var(--ff-carb)",
          fat: "var(--ff-fat)",
          water: "var(--ff-water)",
          xp: "var(--ff-xp)",
          streak: "var(--ff-streak)",
        },
      },
      fontFamily: {
        sans: ["var(--font-manrope)", "system-ui", "sans-serif"],
        display: ["var(--font-sora)", "var(--font-manrope)", "sans-serif"],
      },
      borderRadius: {
        ff: "16px",
        sheet: "24px",
      },
      boxShadow: {
        glow: "0 0 32px color-mix(in srgb, var(--ff-primary) 28%, transparent)",
      },
    },
  },
  plugins: [],
};

export default config;
