"use client";

import { TipsFeed } from "@/components/tips/TipsFeed";
import { useT } from "@/lib/i18n";

export default function TipsPage() {
  const t = useT();
  return (
    <div className="space-y-4">
      <header>
        <h1 className="font-display text-2xl font-semibold">{t("tip.title")}</h1>
        <p className="text-sm text-ff-dim">{t("tip.subtitle")}</p>
      </header>
      <TipsFeed />
    </div>
  );
}
