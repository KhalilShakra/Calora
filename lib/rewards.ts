import { ACHIEVEMENT_SEED } from "@/lib/achievements";
import { addDays, newId, nowIso } from "@/lib/dates";
import { db } from "@/lib/db";
import { levelFromXp, tierFromLevel } from "@/lib/level";
import { caloriesNearTarget, withinTarget } from "@/lib/tdee";
import type {
  DailyProgress,
  RewardEvent,
  Streak,
  StreakKind,
} from "@/types";
import { getUserId } from "@/store/useAuth";

export async function applyLedger(input: {
  eventType: RewardEvent;
  pointsDelta: number;
  xpDelta: number;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
}): Promise<boolean> {
  if (input.idempotencyKey) {
    const existing = await db.rewardsLedger
      .where("idempotencyKey")
      .equals(input.idempotencyKey)
      .first();
    if (existing) return false;
  }

  const userId = getUserId();
  const profile = await db.profiles.get(userId);
  if (!profile) return false;

  await db.rewardsLedger.add({
    id: newId(),
    userId,
    eventType: input.eventType,
    pointsDelta: input.pointsDelta,
    xpDelta: input.xpDelta,
    idempotencyKey: input.idempotencyKey,
    metadata: input.metadata,
    createdAt: nowIso(),
  });

  const xpTotal = profile.xpTotal + input.xpDelta;
  const level = levelFromXp(xpTotal);
  await db.profiles.update(userId, {
    xpTotal,
    pointsBalance: Math.max(0, profile.pointsBalance + input.pointsDelta),
    level,
    tier: tierFromLevel(level),
    updatedAt: nowIso(),
  });

  if (level >= 10) {
    await unlockAchievement("level_10");
  }
  return true;
}

export async function qualifyStreak(kind: StreakKind, localDate: string): Promise<number> {
  const userId = getUserId();
  const row = await db.streaks.get([userId, kind]);
  const base: Streak = row ?? {
    userId,
    kind,
    currentCount: 0,
    longestCount: 0,
    lastQualifiedDate: null,
  };

  if (base.lastQualifiedDate === localDate) return base.currentCount;

  const yesterday = addDays(localDate, -1);
  const nextCount = base.lastQualifiedDate === yesterday ? base.currentCount + 1 : 1;
  const updated: Streak = {
    ...base,
    currentCount: nextCount,
    longestCount: Math.max(base.longestCount, nextCount),
    lastQualifiedDate: localDate,
  };
  await db.streaks.put(updated);

  if (kind === "daily_log") {
    if (nextCount >= 3) await unlockAchievement("streak_3");
    if (nextCount >= 7) await unlockAchievement("streak_7");
    if (nextCount >= 30) await unlockAchievement("streak_30");
    if (nextCount >= 2) {
      await applyLedger({
        eventType: "streak_bonus",
        pointsDelta: 5,
        xpDelta: 8,
        idempotencyKey: `streak:${kind}:${localDate}`,
        metadata: { count: nextCount },
      });
    }
  }
  if (kind === "water" && nextCount >= 7) {
    await unlockAchievement("water_7");
  }
  return nextCount;
}

export async function unlockAchievement(code: string): Promise<void> {
  const achievement = ACHIEVEMENT_SEED.find((a) => a.code === code);
  if (!achievement) return;
  const userId = getUserId();
  const already = await db.userAchievements.get([userId, achievement.id]);
  if (already) return;
  await db.userAchievements.put({
    userId,
    achievementId: achievement.id,
    unlockedAt: nowIso(),
  });
  await applyLedger({
    eventType: "achievement",
    pointsDelta: achievement.pointsReward,
    xpDelta: achievement.xpReward,
    idempotencyKey: `achievement:${code}`,
    metadata: { code },
  });
}

export async function evaluateDailyRewards(progress: DailyProgress): Promise<void> {
  if (progress.hitCalories) {
    await applyLedger({
      eventType: "hit_calories",
      pointsDelta: 20,
      xpDelta: 40,
      idempotencyKey: `hit_calories:${progress.localDate}`,
    });
    await qualifyStreak("calorie_target", progress.localDate);
  }
  if (progress.hitMacros) {
    await applyLedger({
      eventType: "hit_macros",
      pointsDelta: 20,
      xpDelta: 30,
      idempotencyKey: `hit_macros:${progress.localDate}`,
    });
    await qualifyStreak("macro_target", progress.localDate);
    await unlockAchievement("macro_perfect");
  }
  if (progress.hitWater) {
    await applyLedger({
      eventType: "hit_water",
      pointsDelta: 8,
      xpDelta: 15,
      idempotencyKey: `hit_water:${progress.localDate}`,
    });
    await qualifyStreak("water", progress.localDate);
  }
}

export function hitFlags(progress: Omit<DailyProgress, "hitCalories" | "hitMacros" | "hitWater" | "xpEarned" | "pointsEarned">) {
  return {
    hitCalories: caloriesNearTarget(progress.calories, progress.calorieTarget),
    hitMacros:
      withinTarget(progress.proteinG, progress.proteinTarget) &&
      withinTarget(progress.carbsG, progress.carbsTarget) &&
      withinTarget(progress.fatG, progress.fatTarget),
    hitWater: progress.waterMl >= progress.waterTargetMl,
  };
}
