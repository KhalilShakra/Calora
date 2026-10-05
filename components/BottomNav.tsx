"use client";

import { isAuthPath } from "@/lib/auth/paths";
import { cn } from "@/lib/cn";
import { useT, type MessageKey } from "@/lib/i18n";
import { Home, List, PieChart, Plus, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS: Array<{ href: string; labelKey: MessageKey; icon: typeof Home }> = [
  { href: "/", labelKey: "nav.today", icon: Home },
  { href: "/log", labelKey: "nav.log", icon: List },
  { href: "/scan", labelKey: "nav.scan", icon: Plus },
  { href: "/progress", labelKey: "nav.progress", icon: PieChart },
  { href: "/profile", labelKey: "nav.you", icon: User },
];

export function BottomNav() {
  const path = usePathname();
  const t = useT();
  if (path.startsWith("/onboarding") || isAuthPath(path)) return null;
  return (
    <nav className="sticky bottom-0 z-40 overflow-visible border-t border-ff-border bg-ff-elevated/95 px-1 pb-[max(0.45rem,env(safe-area-inset-bottom))] pt-1 backdrop-blur">
      <ul className="grid grid-cols-5 items-end">
        {ITEMS.map((item) => {
          const active =
            item.href === "/"
              ? path === "/"
              : item.href === "/profile"
                ? path.startsWith("/profile") || path.startsWith("/settings")
                : path.startsWith(item.href);
          const Icon = item.icon;
          const center = item.href === "/scan";
          return (
            <li key={item.href} className="min-w-0">
              <Link
                href={item.href}
                className={cn(
                  "flex h-full flex-col items-center justify-end gap-1 px-0.5 py-1 text-center text-[11px] font-medium leading-none",
                  center ? "text-ff-dim" : active ? "text-ff-text" : "text-ff-dim",
                )}
              >
                <span
                  className={cn(
                    "grid place-items-center rounded-full",
                    center
                      ? "-mt-4 h-14 w-14 bg-ff-primary text-[var(--ff-on-primary)] shadow-[0_8px_18px_color-mix(in_srgb,var(--ff-primary)_42%,transparent)]"
                      : "h-7 w-7",
                  )}
                >
                  <Icon size={center ? 26 : 20} strokeWidth={center ? 2.4 : active ? 2.15 : 1.75} />
                </span>
                <span className="max-w-full">{t(item.labelKey)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
