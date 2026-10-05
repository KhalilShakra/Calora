"use client";

import { readStoredLang, useLang } from "@/store/useLang";
import { useLayoutEffect } from "react";

/** Applies the saved language after hydration so the server HTML can stay English. */
export function LangSync() {
  const lang = useLang((s) => s.lang);
  const setLang = useLang((s) => s.setLang);

  useLayoutEffect(() => {
    const stored = readStoredLang();
    if (stored !== useLang.getState().lang) setLang(stored);
    else document.documentElement.lang = stored;
  }, [setLang]);

  useLayoutEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return null;
}
