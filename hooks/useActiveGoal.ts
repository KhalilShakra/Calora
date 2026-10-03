"use client";

import { db } from "@/lib/db";
import { useUserId } from "@/store/useAuth";
import { useLiveQuery } from "dexie-react-hooks";

export function useActiveGoal() {
  const userId = useUserId();
  return useLiveQuery(
    () =>
      db.goals
        .where("userId")
        .equals(userId)
        .filter((goal) => goal.isActive)
        .first(),
    [userId],
  );
}
