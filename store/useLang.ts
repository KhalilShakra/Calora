import { create } from "zustand";

export type Lang = "en" | "sv";

export const LANG_STORAGE_KEY = "ff-lang";

export function readStoredLang(): Lang {
  if (typeof window === "undefined") return "en";
  try {
    return localStorage.getItem(LANG_STORAGE_KEY) === "sv" ? "sv" : "en";
  } catch {
    return "en";
  }
}

interface LangState {
  lang: Lang;
  setLang: (lang: Lang) => void;
}

export const useLang = create<LangState>((set) => ({
  lang: "en",
  setLang: (lang) => {
    try {
      localStorage.setItem(LANG_STORAGE_KEY, lang);
    } catch {
      /* ignore quota / private mode */
    }
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang;
    }
    set({ lang });
  },
}));
