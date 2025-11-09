"use client";

import { ThemeToggle } from "@/components/ui";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { Target01Icon } from "hugeicons-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, useMemo, type ComponentType, type ReactNode, type SVGProps } from "react";
import { resolveNavIcon } from "./nav-icons";

export type SidebarNavItem = {
  href: string;
  label: string;
  icon?: string | ComponentType<SVGProps<SVGSVGElement>>;
  badge?: string;
};

export type SidebarNavGroup = {
  label?: string;
  items: SidebarNavItem[];
};

type BrandConfig = {
  href?: string;
  title: string;
  subtitle?: string;
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
};

type UserIdentity = {
  name?: string | null;
  handle?: string | null;
  email?: string | null;
  image?: string | null;
  role: string;
};

type SidebarShellProps = {
  user: UserIdentity;
  nav: SidebarNavGroup[];
  brand: BrandConfig;
  environmentLabel?: string;
  headerBadge?: ReactNode;
  sidebarFooter?: ReactNode;
  children: ReactNode;
};

export function SidebarShell({
  user,
  nav,
  brand,
  environmentLabel = "OpenSolve",
  headerBadge,
  sidebarFooter,
  children,
}: SidebarShellProps) {
  const pathname = usePathname() || "/";
  const breadcrumbs = buildBreadcrumbs(pathname);
  const navSignature = useMemo(() => JSON.stringify(nav.map((group) => group.items.map((item) => item.href))), [nav]);

  return (
    <SidebarProvider defaultOpen>
      <div className="bg-muted/40 flex min-h-screen w-full">
        <Sidebar
          variant="inset"
          collapsible="icon"
          className="border-border/60 bg-linear-to-b from-background via-background to-muted/30"
        >
          <SidebarBrand brand={brand} />
          <SidebarContent className="px-2 py-6 overflow-x-hidden">
            <div key={navSignature} className="space-y-2 animate-slide-right">
              {nav.map((group, index) => (
                <SidebarGroup key={group.label ?? `group-${index}`}>
                  {group.label ? <SidebarGroupLabel>{group.label}</SidebarGroupLabel> : null}
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {group.items.map((item) => (
                <SidebarNavLink key={item.href} item={item} isActive={pathname.startsWith(item.href)} />
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                  {index < nav.length - 1 ? <SidebarSeparator /> : null}
                </SidebarGroup>
              ))}
            </div>
          </SidebarContent>
          {sidebarFooter ? (
            <SidebarFooter className="mt-auto border-t border-border/60 px-4 py-5">{sidebarFooter}</SidebarFooter>
          ) : (
            <SidebarFooter className="mt-auto px-4 py-5" />
          )}
          <SidebarRail />
        </Sidebar>
        <SidebarInset>
          <div className="flex min-h-svh flex-col">
            <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur">
              <div className="flex h-16 items-center justify-between px-4">
                <div className="flex items-center gap-4">
                  <SidebarTrigger />
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{environmentLabel}</p>
                    <nav className="flex items-center gap-1 text-sm font-medium text-foreground">
                      {breadcrumbs.map((crumb, index) => (
                        <Fragment key={crumb.href}>
                          {index > 0 ? <span className="text-muted-foreground">/</span> : null}
                          <Link
                            href={crumb.href}
                            className={cn(
                              "capitalize",
                              index === breadcrumbs.length - 1
                                ? "text-foreground"
                                : "text-muted-foreground transition-colors hover:text-foreground",
                            )}
                          >
                            {crumb.label}
                          </Link>
                        </Fragment>
                      ))}
                    </nav>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {headerBadge}
                  <ThemeToggle />
                  <UserMenu user={user} />
                </div>
              </div>
            </header>
            <div className="flex-1 px-4 py-8 sm:px-8">{children}</div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

function SidebarBrand({ brand }: { brand: BrandConfig }) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const Icon = brand.icon ?? Target01Icon;

  return (
    <SidebarHeader className={cn("border-border/60 border-b px-4 pb-5 pt-6", collapsed && "px-3 py-6")}>
      <Link
        href={brand.href ?? "/dashboard"}
        aria-label={brand.title}
        className={cn("flex items-center gap-3", collapsed && "justify-center")}
      >
        <div
          className={cn(
            "bg-primary/10 text-primary flex size-10 items-center justify-center rounded-xl",
            collapsed && "size-9",
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        {!collapsed ? (
          <div className="space-y-0.5">
            <p className="text-sm font-semibold leading-tight">{brand.title}</p>
            {brand.subtitle ? (
              <p className="text-[11px] uppercase tracking-wide text-primary">{brand.subtitle}</p>
            ) : null}
          </div>
        ) : null}
      </Link>
    </SidebarHeader>
  );
}

function SidebarNavLink({ item, isActive }: { item: SidebarNavItem; isActive: boolean }) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const Icon = typeof item.icon === "string" || !item.icon ? resolveNavIcon(item.icon) : item.icon;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={isActive}
        tooltip={item.label}
        className={cn(collapsed && "justify-center gap-0")}
      >
        <Link
          href={item.href}
          className={cn("inline-flex items-center gap-2", collapsed && "gap-0")}
          aria-label={collapsed ? item.label : undefined}
        >
          <Icon className="h-4 w-4" />
          <span className={cn(collapsed && "sr-only")}>{item.label}</span>
          {item.badge && !collapsed ? (
            <Badge variant="secondary" className="ml-auto text-[11px] uppercase">
              {item.badge}
            </Badge>
          ) : null}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function UserMenu({ user }: { user: UserIdentity }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="px-2">
          <div className="flex items-center gap-2">
            <Avatar className="size-9 border border-border/70">
              {user.image ? (
                <AvatarImage src={user.image} alt={user.name ?? user.handle ?? "User avatar"} />
              ) : (
                <AvatarFallback className="text-xs font-semibold uppercase">
                  {user.name?.slice(0, 2) ?? user.handle?.slice(0, 2) ?? "OP"}
                </AvatarFallback>
              )}
            </Avatar>
            <div className="hidden text-left sm:block">
              <p className="text-sm font-medium leading-tight">{user.name ?? user.handle ?? "Operator"}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">{user.name ?? user.handle ?? "Operator"}</span>
            <span className="text-xs text-muted-foreground">{user.email}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dashboard">Back to dashboard</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings/profile">Profile</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings/account">Settings</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="text-destructive focus:text-destructive">
          <Link href="/api/auth/signout">Sign out</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function buildBreadcrumbs(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  const crumbs = segments.map((segment, index) => {
    const href = "/" + segments.slice(0, index + 1).join("/");
    const label = segment
      .replace(/\[(.+?)\]/g, "$1")
      .replace(/-/g, " ")
      .replace(/\d+/g, (match) => `#${match}`)
      .replace("staff", "Staff");

    return {
      href,
      label,
    };
  });

  if (!crumbs.length) {
    return [{ href: "/", label: "Home" }];
  }

  return crumbs;
}
