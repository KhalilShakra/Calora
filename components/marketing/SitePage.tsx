"use client";

import { APP_NAME } from "@/design/brand";
import { onboardingRouteState } from "@/lib/actions";
import { useT, type MessageKey } from "@/lib/i18n";
import { useLang, type Lang } from "@/store/useLang";
import {
  Barcode,
  Droplets,
  Scale,
  Trophy,
  Utensils,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type ComponentType } from "react";

const FEATURES: Array<{
  icon: ComponentType<{ size?: number }>;
  title: MessageKey;
  body: MessageKey;
  tint: string;
}> = [
  { icon: Utensils, title: "site.feat.log.title", body: "site.feat.log.body", tint: "var(--ff-primary)" },
  { icon: Barcode, title: "site.feat.scan.title", body: "site.feat.scan.body", tint: "var(--ff-pro)" },
  { icon: RingsIcon, title: "site.feat.rings.title", body: "site.feat.rings.body", tint: "var(--ff-carb)" },
  { icon: Droplets, title: "site.feat.water.title", body: "site.feat.water.body", tint: "var(--ff-water)" },
  { icon: Scale, title: "site.feat.bmi.title", body: "site.feat.bmi.body", tint: "var(--ff-accent)" },
  { icon: Trophy, title: "site.feat.progress.title", body: "site.feat.progress.body", tint: "var(--ff-warning)" },
];

export function SitePage() {
  const t = useT();
  const lang = useLang((s) => s.lang);
  const setLang = useLang((s) => s.setLang);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    onboardingRouteState()
      .then((state) => {
        if (!cancelled) setDone(state.currentDone);
      })
      .catch(() => {
        /* stay on the public start link */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const href = done ? "/" : "/onboarding";
  const cta = done ? t("site.nav.open") : t("site.nav.start");

  return (
    <div className="mx-auto max-w-6xl px-5 text-ff-text">
      <header className="sticky top-0 z-20 -mx-5 flex items-center justify-between gap-3 border-b border-ff-border/70 bg-[color-mix(in_srgb,var(--ff-canvas)_78%,transparent)] px-5 py-3 backdrop-blur-md">
        <a href="#top" className="flex items-center gap-2.5">
          <img src="/icon.svg" alt="" className="h-9 w-9 rounded-xl" />
          <span className="font-display text-lg font-semibold tracking-tight">{APP_NAME}</span>
        </a>
        <div className="flex items-center gap-2">
          <LangSwitch lang={lang} setLang={setLang} />
          <Link
            href={href}
            className="hidden rounded-full bg-ff-primary px-4 py-2 text-sm font-semibold text-[var(--ff-on-primary)] sm:inline-flex"
          >
            {cta}
          </Link>
        </div>
      </header>

      <main id="top">
        <section className="grid items-center gap-12 py-14 md:grid-cols-[1.1fr_0.9fr] md:py-20">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-ff-primary">
              {t("site.hero.kicker")}
            </p>
            <h1 className="mt-4 max-w-xl font-display text-5xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
              {t("tagline")}
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-ff-dim">{t("site.hero.body")}</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href={href}
                className="rounded-full bg-ff-primary px-6 py-3 text-sm font-semibold text-[var(--ff-on-primary)] shadow-glow"
              >
                {cta}
              </Link>
              <a
                href="#how"
                className="rounded-full border border-ff-border bg-ff-surface px-6 py-3 text-sm font-semibold"
              >
                {t("site.hero.secondary")}
              </a>
            </div>
          </div>
          <PhonePreview />
        </section>

        <section className="pb-16">
          <div className="max-w-xl">
            <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
              {t("site.feat.title")}
            </h2>
            <p className="mt-3 text-ff-dim">{t("site.feat.body")}</p>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <article
                  key={feature.title}
                  className="rounded-sheet border border-ff-border bg-ff-surface p-5"
                >
                  <span
                    className="grid h-11 w-11 place-items-center rounded-2xl"
                    style={{
                      background: `color-mix(in srgb, ${feature.tint} 18%, transparent)`,
                      color: feature.tint,
                    }}
                  >
                    <Icon size={20} />
                  </span>
                  <h3 className="mt-4 font-display text-lg font-semibold">{t(feature.title)}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ff-dim">{t(feature.body)}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section id="how" className="scroll-mt-20 pb-16">
          <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
            {t("site.steps.title")}
          </h2>
          <ol className="mt-8 grid gap-4 md:grid-cols-3">
            {(
              [
                ["01", "site.steps.1.title", "site.steps.1.body"],
                ["02", "site.steps.2.title", "site.steps.2.body"],
                ["03", "site.steps.3.title", "site.steps.3.body"],
              ] as const
            ).map(([n, title, body]) => (
              <li key={n} className="rounded-sheet border border-ff-border bg-ff-elevated p-5">
                <p className="font-display text-sm font-semibold text-ff-primary">{n}</p>
                <h3 className="mt-3 font-display text-xl font-semibold">{t(title)}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ff-dim">{t(body)}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mb-16 overflow-hidden rounded-[28px] border border-ff-border bg-ff-surface px-6 py-10 md:px-10">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-ff-primary">{APP_NAME}</p>
          <h2 className="mt-3 max-w-lg font-display text-4xl font-semibold tracking-tight">
            {t("site.close.title")}
          </h2>
          <p className="mt-3 max-w-md text-ff-dim">{t("site.close.body")}</p>
          <Link
            href={href}
            className="mt-7 inline-flex rounded-full bg-ff-primary px-6 py-3 text-sm font-semibold text-[var(--ff-on-primary)]"
          >
            {cta}
          </Link>
        </section>
      </main>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-ff-border py-6 text-sm text-ff-dim">
        <span className="font-display font-semibold text-ff-text">{APP_NAME}</span>
        <span>{t("tagline")}</span>
      </footer>
    </div>
  );
}

function LangSwitch({ lang, setLang }: { lang: Lang; setLang: (lang: Lang) => void }) {
  return (
    <div className="flex rounded-full border border-ff-border bg-ff-surface p-1 text-xs font-semibold">
      {(
        [
          ["en", "EN"],
          ["sv", "SV"],
        ] as const
      ).map(([code, label]) => (
        <button
          key={code}
          type="button"
          aria-pressed={lang === code}
          onClick={() => setLang(code)}
          className={`rounded-full px-3 py-1.5 ${
            lang === code ? "bg-ff-primary text-[var(--ff-on-primary)]" : "text-ff-dim"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function PhonePreview() {
  const t = useT();
  return (
    <div className="relative mx-auto w-full max-w-[340px]" aria-hidden>
      <div className="absolute -inset-8 rounded-[48px] bg-[color-mix(in_srgb,var(--ff-primary)_16%,transparent)] blur-3xl" />
      <div className="relative rounded-[36px] border border-ff-border bg-ff-bg p-3 shadow-glow">
        <div className="rounded-[28px] border border-ff-border bg-ff-surface px-4 pb-5 pt-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-ff-dim">{APP_NAME}</p>
              <p className="font-display text-lg font-semibold">{t("nav.today")}</p>
            </div>
            <img src="/icon.svg" alt="" className="h-9 w-9 rounded-xl" />
          </div>
          <div className="mx-auto mt-5 grid h-40 w-40 place-items-center rounded-full bg-[conic-gradient(var(--ff-primary)_72%,var(--ff-surface-muted)_0)]">
            <div className="grid h-[118px] w-[118px] place-items-center rounded-full bg-ff-surface text-center">
              <div>
                <p className="font-display text-3xl font-semibold leading-none">1 248</p>
                <p className="mt-1 text-[11px] text-ff-dim">{t("site.mock.left")}</p>
              </div>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2 text-center">
            <Macro label={t("dash.protein")} value="92" tint="var(--ff-pro)" />
            <Macro label={t("dash.carbs")} value="140" tint="var(--ff-carb)" />
            <Macro label={t("dash.fat")} value="48" tint="var(--ff-fat)" />
          </div>
          <div className="mt-4 flex items-center justify-between rounded-2xl bg-ff-elevated px-3 py-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Droplets size={16} className="text-[var(--ff-water)]" />
              {t("dash.water")}
            </div>
            <p className="text-sm tabular-nums text-ff-dim">750/2500 ml</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Macro({ label, value, tint }: { label: string; value: string; tint: string }) {
  return (
    <div>
      <div
        className="mx-auto h-10 w-10 rounded-full"
        style={{ background: `conic-gradient(${tint} 60%, var(--ff-surface-muted) 0)` }}
      />
      <p className="mt-2 text-sm font-semibold tabular-nums">{value} g</p>
      <p className="text-[11px] text-ff-dim">{label}</p>
    </div>
  );
}

function RingsIcon(props: { size?: number }) {
  return (
    <svg width={props.size ?? 20} height={props.size ?? 20} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2.2" />
      <path d="M12 4a8 8 0 0 1 6.9 4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}
