"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  History,
  LayoutDashboard,
  ListChecks,
  Lock,
  Menu,
  Shield,
  Sparkles,
  Trophy,
  User,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export type NavItem = {
  title: string;
  href: string;
  icon?: string;
  badge?: string;
  soon?: boolean;
  exact?: boolean;
};

type DynamicSidebarProps = {
  items: NavItem[];
  footer?: React.ReactNode;
  className?: string;
};

const iconMap = {
  "layout-dashboard": LayoutDashboard,
  "list-checks": ListChecks,
  history: History,
  trophy: Trophy,
  sparkles: Sparkles,
  users: Users,
  user: User,
  shield: Shield,
  lock: Lock,
};

const getIcon = (iconName?: string) => {
  if (!iconName) return null;
  return iconMap[iconName as keyof typeof iconMap] || null;
};

export const DynamicSidebar = ({ items, footer, className }: DynamicSidebarProps) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="fixed left-4 top-4 z-50 h-9 w-9 p-0 lg:hidden"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle navigation menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <SidebarContent items={items} footer={footer} onItemClick={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <aside className={cn("hidden h-full w-64 flex-shrink-0 lg:block", className)}>
        <SidebarContent items={items} footer={footer} />
      </aside>
    </>
  );
};

const SidebarContent = ({
  items,
  footer,
  onItemClick,
}: {
  items: NavItem[];
  footer?: React.ReactNode;
  onItemClick?: () => void;
}) => {
  const pathname = usePathname();
  const [prevItems, setPrevItems] = useState(items);
  const [direction, setDirection] = useState<"left" | "right">("right");

  useEffect(() => {
    if (JSON.stringify(items) !== JSON.stringify(prevItems)) {
      const prevPaths = prevItems.map((item) => item.href);
      const newPaths = items.map((item) => item.href);
      const isNewSection = !prevPaths.some((path) => newPaths.includes(path));
      
      setDirection(isNewSection ? "right" : "left");
      setPrevItems(items);
    }
  }, [items, prevItems]);

  return (
    <nav className="flex h-full flex-col bg-sidebar/50 backdrop-blur-sm">
      <div className="flex-1 space-y-1 overflow-y-auto p-3">
        <div className={cn("space-y-1", direction === "right" ? "animate-slide-right" : "animate-slide-left")}>
          {items.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname?.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onItemClick}
                className={cn(
                  "group relative flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm font-medium smooth-transition focus-ring",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
              >
                <div className="flex items-center gap-3">
                  {item.icon ? (
                    (() => {
                      const Icon = getIcon(item.icon);
                      return Icon ? (
                        <Icon
                          className={cn(
                            "h-4 w-4 transition-colors",
                            isActive ? "text-sidebar-primary" : "text-sidebar-foreground/60"
                          )}
                        />
                      ) : null;
                    })()
                  ) : null}
                  <span>{item.title}</span>
                </div>
                {item.badge ? (
                  <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-semibold">
                    {item.badge}
                  </Badge>
                ) : item.soon ? (
                  <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                    Soon
                  </Badge>
                ) : null}
                {isActive ? (
                  <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-sidebar-primary" />
                ) : null}
              </Link>
            );
          })}
        </div>
      </div>

      {footer ? (
        <div className="border-t border-sidebar-border bg-sidebar/30 p-3">
          {footer}
        </div>
      ) : null}
    </nav>
  );
};

export const MobileSidebarTrigger = () => {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-9 w-9 p-0 lg:hidden"
    >
      <Menu className="h-5 w-5" />
      <span className="sr-only">Toggle navigation menu</span>
    </Button>
  );
};

