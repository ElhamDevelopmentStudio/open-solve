"use client";

import Link from "next/link";
import {
  Award02Icon,
  ClipboardIcon,
  CodeCircleIcon,
  LegalHammerIcon,
  Megaphone01Icon,
  Message01Icon,
  PathIcon,
} from "hugeicons-react";
import { Badge } from "@/components/ui/badge";
import {
  SidebarShell,
  type SidebarNavGroup,
  type SidebarNavItem,
} from "@/components/layout/sidebar-shell";

type StaffAppShellProps = {
  user: {
    name?: string | null;
    handle?: string | null;
    email?: string | null;
    image?: string | null;
    role: string;
  };
  children: React.ReactNode;
};

const operationsNav: SidebarNavItem[] = [
  {
    href: "/staff/contests",
    label: "Contests",
    icon: Award02Icon,
    badge: "live",
  },
];

const creationNav: SidebarNavItem[] = [
  {
    href: "/staff/problems",
    label: "Problem Bank",
    icon: CodeCircleIcon,
  },
  {
    href: "/staff/proposals",
    label: "Proposals",
    icon: ClipboardIcon,
  },
];

const moderationNav: SidebarNavItem[] = [
  {
    href: "/staff/judge/manual",
    label: "Manual Judge",
    icon: LegalHammerIcon,
  },
  {
    href: "/staff/discussions",
    label: "Discussions",
    icon: Message01Icon,
  },
  {
    href: "/staff/trails",
    label: "Trail Insights",
    icon: PathIcon,
  },
];

export function StaffAppShell({ user, children }: StaffAppShellProps) {
  const navGroups: SidebarNavGroup[] = [];

  if (user.role === "ADMIN") {
    navGroups.push({ label: "Operations", items: operationsNav });
  }
  if (user.role === "MODERATOR" || user.role === "ADMIN") {
    navGroups.push({ label: "Monitoring", items: moderationNav });
  }
  if (user.role === "PROBLEM_CURATOR" || user.role === "ADMIN") {
    navGroups.push({ label: "Creation", items: creationNav });
  }
  return (
    <SidebarShell
      user={user}
      nav={navGroups}
      brand={{
        title: "OpenSolve",
        subtitle: "Staff Console",
        href: "/dashboard",
        icon: Megaphone01Icon,
      }}
      environmentLabel="OpenSolve Staff"
      headerBadge={
        <Badge
          variant="secondary"
          className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
        >
          Systems nominal
        </Badge>
      }
      sidebarFooter={<SidebarOpsFooter role={user.role} />}
    >
      {children}
    </SidebarShell>
  );
}

function SidebarOpsFooter({ role }: { role: string }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Environment</span>
        <Badge
          variant="outline"
          className="border-blue-500/40 text-[11px] text-blue-600 dark:text-blue-300"
        >
          Control
        </Badge>
      </div>
      {role === "ADMIN" ? (
        <Link
          href="/staff/contests/new"
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
        >
          <Megaphone01Icon className="h-4 w-4" />
          Launch contest
        </Link>
      ) : null}
      <p className="text-[11px] text-muted-foreground">
        Need elevated access?{" "}
        <Link href="/support" className="text-primary underline">
          Contact SRE
        </Link>
      </p>
    </div>
  );
}
