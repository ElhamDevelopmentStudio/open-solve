import { SidebarShell, type SidebarNavGroup } from "@/components/layout/sidebar-shell";
import { Badge } from "@/components/ui/badge";
import { dashboardNav } from "@/config/navigation";
import { isStaffRole } from "@/lib/auth/permissions";
import { getSession } from "@/lib/auth/session";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { PropsWithChildren } from "react";

export const dynamic = "force-dynamic";

export default async function PlatformLayout({ children }: PropsWithChildren) {
  const session = await getSession();
  if (!session) {
    redirect("/sign-in");
  }
  const staffAccess = isStaffRole(session.user.role);
  const sidebarNav: SidebarNavGroup[] = [
    {
      label: "Workspace",
      items: dashboardNav.map((item) => ({
        href: item.href,
        label: item.title,
        icon: item.icon,
        badge: item.soon ? "soon" : undefined,
      })),
    },
  ];

  return (
    <SidebarShell
      user={session.user}
      nav={sidebarNav}
      brand={{ title: "OpenSolve", subtitle: "Workspace", href: "/dashboard" }}
      environmentLabel="OpenSolve Workspace"
      headerBadge={
        <Badge variant="secondary" className="bg-primary/10 text-primary">
          {session.user.role.toLowerCase()}
        </Badge>
      }
      sidebarFooter={
        <PlatformSidebarFooter staffAccess={staffAccess} isAdmin={session.user.role === "ADMIN"} />
      }
    >
      <div className="min-h-[calc(100vh-3.5rem)] bg-background p-4 sm:p-6">{children}</div>
    </SidebarShell>
  );
}

function PlatformSidebarFooter({
  staffAccess,
  isAdmin,
}: {
  staffAccess: boolean;
  isAdmin: boolean;
}) {
  return (
    <div className="space-y-3 text-xs text-muted-foreground">
      {staffAccess ? (
        <Link
          href="/staff/contests"
          className="flex items-center gap-2 rounded-2xl border border-border/60 px-3 py-2 font-medium text-primary"
        >
          Staff Console
        </Link>
      ) : null}
      {isAdmin ? (
        <Link
          href="/admin"
          className="flex items-center gap-2 rounded-2xl border border-border/60 px-3 py-2 font-medium text-muted-foreground transition hover:text-foreground"
        >
          Admin Panel
        </Link>
      ) : null}
      <p>Need help? Visit support or drop into #ops.</p>
    </div>
  );
}
