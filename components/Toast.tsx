"use client";

import { useUi } from "@/store/useUi";
import { useEffect } from "react";

export function Toast() {
  const toast = useUi((s) => s.toast);
  const clear = useUi((s) => s.clearToast);
  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(clear, 2400);
    return () => window.clearTimeout(id);
  }, [toast, clear]);
  if (!toast) return null;
  return (
    <div className="pointer-events-none fixed bottom-24 left-1/2 z-50 w-[min(92%,28rem)] -translate-x-1/2 rounded-full bg-ff-primary px-4 py-2 text-center text-sm font-semibold text-[var(--ff-on-primary)] shadow-glow">
      {toast}
    </div>
  );
}
