"use client";

import { isAuthPath } from "@/lib/auth/paths";
import { cn } from "@/lib/cn";
import { Camera, Home, Plus, Trophy, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/log", label: "Log", icon: Plus },
  { href: "/scan", label: "Scan", icon: Camera },
  { href: "/progress", label: "Progress", icon: Trophy },
  { href: "/profile", label: "You", icon: User },
] as const;

export function BottomNav() {
  const path = usePathname();
  if (path.startsWith("/onboarding") || isAuthPath(path)) return null;
  return (
    <nav className="sticky bottom-0 z-40 border-t border-ff-border bg-ff-elevated/95 px-2 pb-[max(0.6rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur">
      <ul className="grid grid-cols-5">
        {ITEMS.map((item) => {
          const active =
            item.href === "/"
              ? path === "/"
              : item.href === "/profile"
                ? path.startsWith("/profile") || path.startsWith("/settings")
                : path.startsWith(item.href);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 py-1 text-[11px] font-medium",
                  active ? "text-ff-primary" : "text-ff-dim",
                )}
              >
                <span
                  className={cn(
                    "grid h-8 w-8 place-items-center rounded-full",
                    item.href === "/scan" && "bg-ff-primary text-slate-950",
                    item.href === "/scan" && !active && "opacity-90",
                    active && item.href !== "/scan" && "bg-ff-muted",
                  )}
                >
                  <Icon size={18} />
                </span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
