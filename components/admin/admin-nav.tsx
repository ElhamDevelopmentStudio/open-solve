"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ActivitySquare,
  ClipboardList,
  Gavel,
  LayoutDashboard,
  MessageSquare,
  ShieldCheck,
  Trophy,
  Users2,
} from "@/components/icons";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const iconMap = {
  dashboard: LayoutDashboard,
  users: Users2,
  problems: ClipboardList,
  submissions: Gavel,
  discussions: MessageSquare,
  contests: Trophy,
  system: ShieldCheck,
  audit: ActivitySquare,
};

export type AdminNavIcon = keyof typeof iconMap;

export type AdminNavItem = {
  title: string;
  href: string;
  icon: AdminNavIcon;
  badge?: string;
};

export function AdminNav({ items }: { items: AdminNavItem[] }) {
  const pathname = usePathname() || "";
  return (
    <div className="flex flex-1 flex-col gap-2 py-6 pr-4">
      {items.map((item) => {
        const Icon = iconMap[item.icon];
        const isActive =
          pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "group flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition-all",
              isActive
                ? "bg-primary/10 text-primary shadow-sm"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            <span className="flex items-center gap-2">
              <span
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-xl border border-border/40 bg-background text-muted-foreground transition",
                  isActive && "border-primary/40 text-primary",
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              {item.title}
            </span>
            {item.badge ? (
              <Badge variant="secondary" className="text-[11px]">
                {item.badge}
              </Badge>
            ) : null}
          </Link>
        );
      })}
    </div>
  );
}
