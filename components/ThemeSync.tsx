"use client";

import { db } from "@/lib/db";
import { useUserId } from "@/store/useAuth";
import { useLiveQuery } from "dexie-react-hooks";
import { useEffect } from "react";

export function ThemeSync() {
  const userId = useUserId();
  const profile = useLiveQuery(() => db.profiles.get(userId), [userId]);
  useEffect(() => {
    document.documentElement.dataset.theme = profile?.themeId ?? "dark";
  }, [profile?.themeId]);
  return null;
}
