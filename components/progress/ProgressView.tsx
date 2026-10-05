"use client";

import { addWeighIn } from "@/lib/actions";
import { computeBmi } from "@/lib/bmi";
import { db } from "@/lib/db";
import { achievementCopy, intlLocale, STREAK_KEY, TIER_KEY, useT } from "@/lib/i18n";
import { levelFromXp, xpIntoLevel } from "@/lib/level";
import { useLang } from "@/store/useLang";
import { tiers } from "@/design/brand";
import { addDays, todayKey } from "@/lib/dates";
import { NumberField } from "@/components/ui/NumberField";
import { Button, Card, Field } from "@/components/ui";
import { useUi } from "@/store/useUi";
import { useUserId } from "@/store/useAuth";
import type { Tier } from "@/types";
import { useLiveQuery } from "dexie-react-hooks";
import { Medal, Trophy } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

const ACHIEVEMENT_DISPLAY_ORDER = [
  "first_log",
  "streak_3",
  "macro_perfect",
  "weigh_in_4",
  "streak_7",
  "water_7",
  "level_10",
  "streak_30",
];

export function ProgressView() {
  const showToast = useUi((s) => s.showToast);
  const t = useT();
  const lang = useLang((s) => s.lang);
  const [weight, setWeight] = useState(78);
  const [weightError, setWeightError] = useState<string | null>(null);
  const weightValid = useRef(true);
  const userId = useUserId();
  const profile = useLiveQuery(() => db.profiles.get(userId), [userId]);
  const streaks = useLiveQuery(() => db.streaks.where("userId").equals(userId).toArray(), [userId]);
  const unlocks = useLiveQuery(() => db.userAchievements.where("userId").equals(userId).toArray(), [userId]);
  const catalog = useLiveQuery(() => db.achievements.toArray());
  const metrics = useLiveQuery(
    () => db.bodyMetrics.where("userId").equals(userId).sortBy("localDate"),
    [userId],
  );
  const weighIns = [...(metrics ?? [])].reverse().slice(0, 6);
  const week = lastSeven();
  const weekWeights = carryWeights(week, metrics ?? [], profile?.currentWeightKg ?? 0);
  const weekLabels = week.map((day) => weekdayLabel(day, lang));
  const heightCm = profile?.heightCm ?? 0;
  const previewBmi = heightCm ? computeBmi(weight, heightCm) : 0;
  const xp = profile ? xpIntoLevel(profile.xpTotal) : { current: 0, needed: 500, ratio: 0 };
  const level = profile ? levelFromXp(profile.xpTotal) : 1;
  const xpCurrent = Math.round(xp.current);
  const xpLeft = Math.max(0, xp.needed - xpCurrent);
  const achievements = useMemo(() => {
    const order = new Map(ACHIEVEMENT_DISPLAY_ORDER.map((id, index) => [id, index]));
    return [...(catalog ?? [])].sort((a, b) => (order.get(a.id) ?? 99) - (order.get(b.id) ?? 99));
  }, [catalog]);

  useEffect(() => {
    if (profile?.currentWeightKg) setWeight(profile.currentWeightKg);
  }, [profile?.currentWeightKg]);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="font-display text-2xl font-semibold">{t("progress.title")}</h1>
        <p className="text-sm text-ff-dim">{t("progress.subtitle")}</p>
        <a href="/tips" className="mt-2 inline-block text-sm font-semibold text-ff-primary">
          {t("progress.nudge")}
        </a>
      </header>

      <Card>
        <p className="font-display text-4xl font-semibold leading-none tabular-nums">
          {profile ? formatWeight(profile.currentWeightKg) : "—"}
          <span className="ml-1 text-lg font-medium text-ff-dim">kg</span>
        </p>
        <p className="mt-1 text-sm text-ff-dim">{t("progress.current")}</p>
      </Card>

      <Card>
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <p className="text-sm font-semibold">{t("profile.weight")}</p>
          <p className="text-xs text-ff-dim">{t("progress.week")}</p>
        </div>
        {weekWeights.some((value) => value > 0) && (
          <WeightWeekChart labels={weekLabels} weights={weekWeights} />
        )}
      </Card>

      <Card className="space-y-3">
        <p className="font-semibold">{t("progress.weighIn")}</p>
        <Field label={t("progress.weight")}>
          <NumberField
            value={weight}
            error={weightError}
            onValueChange={(next) => {
              setWeight(next);
              setWeightError(null);
            }}
            onValidityChange={(ok) => {
              weightValid.current = ok;
            }}
          />
        </Field>
        {heightCm > 0 && (
          <p className="text-sm text-ff-dim">
            {t("progress.bmiAt")} <span className="font-semibold text-ff-text">{previewBmi}</span>
          </p>
        )}
        <Button
          className="w-full"
          onClick={async () => {
            if (!weightValid.current) {
              setWeightError(t("progress.errWeight"));
              return;
            }
            if (!(weight > 0)) {
              setWeightError(t("progress.errWeight0"));
              return;
            }
            await addWeighIn(todayKey(), weight);
            showToast(t("progress.toastWeigh", { bmi: computeBmi(weight, heightCm) }));
          }}
        >
          {t("progress.logWeigh")}
        </Button>
        <ul className="space-y-1 text-sm text-ff-dim">
          {weighIns.map((w) => (
            <li key={w.id} className="flex justify-between gap-3">
              <span>{w.localDate}</span>
              <span className="shrink-0">
                {w.weightKg} kg
                {heightCm > 0 ? ` · BMI ${computeBmi(w.weightKg, heightCm)}` : ""}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="space-y-2">
        <p className="font-semibold">{t("progress.streaks")}</p>
        {(streaks ?? []).map((s) => (
          <div key={s.kind} className="flex items-center justify-between text-sm">
            <span className="text-ff-dim">{t(STREAK_KEY[s.kind])}</span>
            <span className="font-semibold">
              {s.currentCount} <span className="text-ff-dim">{t("progress.best", { n: s.longestCount })}</span>
            </span>
          </div>
        ))}
      </Card>

      <Card>
        <div className="flex items-center gap-3">
          <img src="/icon.svg" alt="" className="h-9 w-9 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="font-display text-xl font-semibold">{t("profile.level", { n: level })}</p>
            <p className="text-xs capitalize text-ff-dim">
              {profile ? t("profile.tierLine", { tier: t(TIER_KEY[profile.tier]) }) : ""}
            </p>
          </div>
          {profile ? <TierMark tier={profile.tier} /> : null}
        </div>
        <div
          className="mt-3 h-2 overflow-hidden rounded-full bg-ff-muted"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={xp.needed}
          aria-valuenow={xpCurrent}
          aria-label={t("progress.xpLeft", { n: xpLeft, level: level + 1 })}
        >
          <div className="h-full rounded-full bg-ff-xp" style={{ width: `${xp.ratio * 100}%` }} />
        </div>
        <div className="mt-2 flex items-baseline justify-between gap-3 text-xs">
          <span className="text-ff-dim">{t("progress.xpOf", { current: xpCurrent, needed: xp.needed })}</span>
          <span className="text-right font-semibold">{t("progress.xpLeft", { n: xpLeft, level: level + 1 })}</span>
        </div>
      </Card>

      <Card className="space-y-2">
        <p className="font-semibold">{t("progress.achievements")}</p>
        {achievements.map((a) => {
          const got = unlocks?.some((u) => u.achievementId === a.id);
          const copy = achievementCopy(a.code || a.id, lang, { title: a.title, description: a.description });
          return (
            <div
              key={a.id}
              data-unlocked={got ? "true" : "false"}
              className={`flex items-start gap-3 rounded-ff border px-3 py-2 ${got ? "border-ff-primary bg-ff-muted" : "border-ff-border opacity-60"}`}
            >
              <TierMark tier={a.tier} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{copy.title}</p>
                  <p className="shrink-0 text-xs uppercase text-ff-dim">{t(TIER_KEY[a.tier])}</p>
                </div>
                <p className="text-xs text-ff-dim">{copy.description}</p>
              </div>
            </div>
          );
        })}
      </Card>
    </div>
  );
}

function TierMark({ tier }: { tier: Tier }) {
  const Icon = tier === "gold" || tier === "platinum" ? Trophy : Medal;
  const color = tiers[tier];
  return (
    <span
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
      style={{ color, backgroundColor: `color-mix(in srgb, ${color} 18%, transparent)` }}
      aria-hidden
    >
      <Icon size={16} strokeWidth={2.25} />
    </span>
  );
}

function lastSeven(): string[] {
  const end = todayKey();
  return Array.from({ length: 7 }, (_, i) => addDays(end, i - 6));
}

function carryWeights(
  days: string[],
  metrics: Array<{ localDate: string; weightKg: number }>,
  fallback: number,
): number[] {
  const sorted = [...metrics].sort((a, b) => a.localDate.localeCompare(b.localDate));
  let index = 0;
  let last = fallback;
  return days.map((day) => {
    while (index < sorted.length && sorted[index].localDate <= day) {
      last = sorted[index].weightKg;
      index += 1;
    }
    return last;
  });
}

function weekdayLabel(iso: string, lang: "en" | "sv"): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d)
    .toLocaleDateString(intlLocale(lang), { weekday: "short" })
    .replace(/\.$/, "");
}

function formatWeight(kg: number): string {
  if (!Number.isFinite(kg) || kg <= 0) return "—";
  const rounded = Math.round(kg * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function WeightWeekChart({ labels, weights }: { labels: string[]; weights: number[] }) {
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  const span = max - min;
  const pad = span < 0.3 ? 1.2 : span * 0.45;
  const lo = min - pad;
  const hi = max + pad;
  const width = 280;
  const height = 108;
  const insetX = 12;
  const insetY = 14;
  const points = weights.map((value, i) => {
    const x = insetX + (i / Math.max(weights.length - 1, 1)) * (width - insetX * 2);
    const y = insetY + (1 - (value - lo) / (hi - lo)) * (height - insetY * 2);
    return { x, y };
  });
  const line = points.map((point, i) => `${i === 0 ? "M" : "L"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" ");
  const last = points[points.length - 1];
  const first = points[0];
  const area = `${line} L${last.x.toFixed(1)} ${height - 2} L${first.x.toFixed(1)} ${height - 2} Z`;

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-28 w-full overflow-visible">
        <path d={area} fill="color-mix(in srgb, var(--ff-primary) 34%, transparent)" />
        <path d={line} fill="none" stroke="var(--ff-text)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={last.x} cy={last.y} r="5.5" fill="var(--ff-primary)" />
        <circle cx={last.x} cy={last.y} r="2.2" fill="var(--ff-on-primary)" />
      </svg>
      <div className="mt-2 grid grid-cols-7 text-center text-[10px] leading-none text-ff-dim">
        {labels.map((label, i) => (
          <span key={`${label}-${i}`}>{label}</span>
        ))}
      </div>
    </div>
  );
}
