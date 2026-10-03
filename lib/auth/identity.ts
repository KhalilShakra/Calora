import { nowIso } from "@/lib/dates";
import { db } from "@/lib/db";
import { LOCAL_USER_ID } from "@/types";

const migratedKey = (userId: string) => `ff-migrated:${userId}`;

export function hasMigratedLocalVault(userId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(migratedKey(userId)) === "1";
  } catch {
    return false;
  }
}

export function markMigratedLocalVault(userId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(migratedKey(userId), "1");
  } catch {
    /* ignore */
  }
}

/**
 * Copy local-only Dexie rows from `local-user` onto the signed-in uid once,
 * then drop the local-user copies so live queries do not double-count.
 */
export async function migrateLocalVaultToUser(userId: string): Promise<boolean> {
  if (!userId || userId === LOCAL_USER_ID) return false;
  if (hasMigratedLocalVault(userId)) return false;

  const localProfile = await db.profiles.get(LOCAL_USER_ID);
  const tables = [
    db.profiles,
    db.goals,
    db.foodLogs,
    db.customFoods,
    db.recipes,
    db.waterLogs,
    db.bodyMetrics,
    db.dailyProgress,
    db.streaks,
    db.userAchievements,
    db.rewardsLedger,
  ];

  await db.transaction("rw", tables, async () => {
    if (localProfile) {
      const existing = await db.profiles.get(userId);
      if (!existing) {
        await db.profiles.put({
          ...localProfile,
          id: userId,
          updatedAt: nowIso(),
        });
      } else if (!existing.onboardingCompletedAt && localProfile.onboardingCompletedAt) {
        await db.profiles.put({
          ...localProfile,
          id: userId,
          updatedAt: nowIso(),
        });
      }
      await db.profiles.delete(LOCAL_USER_ID);
    }

    const goals = await db.goals.where("userId").equals(LOCAL_USER_ID).toArray();
    for (const goal of goals) {
      await db.goals.update(goal.id, { userId });
    }

    const logs = await db.foodLogs.where("userId").equals(LOCAL_USER_ID).toArray();
    for (const log of logs) {
      await db.foodLogs.update(log.id, { userId });
    }

    const foods = await db.customFoods.where("userId").equals(LOCAL_USER_ID).toArray();
    for (const food of foods) {
      await db.customFoods.update(food.id, { userId });
    }

    const recipes = await db.recipes.where("userId").equals(LOCAL_USER_ID).toArray();
    for (const recipe of recipes) {
      await db.recipes.update(recipe.id, { userId });
    }

    const waters = await db.waterLogs.where("userId").equals(LOCAL_USER_ID).toArray();
    for (const water of waters) {
      await db.waterLogs.update(water.id, { userId });
    }

    const metrics = await db.bodyMetrics.where("userId").equals(LOCAL_USER_ID).toArray();
    for (const metric of metrics) {
      await db.bodyMetrics.update(metric.id, { userId });
    }

    const progress = await db.dailyProgress.where("userId").equals(LOCAL_USER_ID).toArray();
    for (const row of progress) {
      const dest = await db.dailyProgress.get([userId, row.localDate]);
      if (!dest) await db.dailyProgress.put({ ...row, userId });
      await db.dailyProgress.where("[userId+localDate]").equals([LOCAL_USER_ID, row.localDate]).delete();
    }

    const streaks = await db.streaks.where("userId").equals(LOCAL_USER_ID).toArray();
    for (const row of streaks) {
      const dest = await db.streaks.get([userId, row.kind]);
      if (!dest) {
        await db.streaks.put({ ...row, userId });
      } else {
        const destDate = dest.lastQualifiedDate ?? "";
        const srcDate = row.lastQualifiedDate ?? "";
        await db.streaks.put({
          userId,
          kind: row.kind,
          currentCount: Math.max(dest.currentCount, row.currentCount),
          longestCount: Math.max(dest.longestCount, row.longestCount),
          lastQualifiedDate: srcDate > destDate ? row.lastQualifiedDate : dest.lastQualifiedDate,
        });
      }
      await db.streaks.where("[userId+kind]").equals([LOCAL_USER_ID, row.kind]).delete();
    }

    const unlocks = await db.userAchievements.where("userId").equals(LOCAL_USER_ID).toArray();
    for (const row of unlocks) {
      const dest = await db.userAchievements.get([userId, row.achievementId]);
      if (!dest) await db.userAchievements.put({ ...row, userId });
      await db.userAchievements.where("[userId+achievementId]").equals([LOCAL_USER_ID, row.achievementId]).delete();
    }

    const ledger = await db.rewardsLedger.where("userId").equals(LOCAL_USER_ID).toArray();
    for (const row of ledger) {
      await db.rewardsLedger.update(row.id, { userId });
    }
  });

  markMigratedLocalVault(userId);
  return Boolean(localProfile);
}
