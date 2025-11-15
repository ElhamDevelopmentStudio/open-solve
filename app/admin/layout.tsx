import { SidebarShell, type SidebarNavGroup } from "@/components/layout/sidebar-shell";
import { Badge } from "@/components/ui/badge";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import type { PropsWithChildren } from "react";
import Link from "next/link";

const adminNav = [
  { title: "Overview", href: "/admin", icon: "dashboard", exact: true },
  { title: "Users & Roles", href: "/admin/users", icon: "users" },
  { title: "Problems", href: "/admin/problems", icon: "problems" },
  { title: "Submissions & Judge", href: "/admin/submissions", icon: "submissions" },
  { title: "Discussions & Trails", href: "/admin/discussions", icon: "discussions" },
  { title: "Contests", href: "/admin/contests", icon: "contests" },
  { title: "System & Flags", href: "/admin/system", icon: "system" },
  { title: "Audit & Incidents", href: "/admin/audit", icon: "audit" },
];

export default async function AdminLayout({ children }: PropsWithChildren) {
  const session = await getSession();
  if (!session || session.user.role !== "ADMIN" || session.session.impersonatorId) {
    redirect("/dashboard");
  }

  const nav: SidebarNavGroup[] = [
    {
      label: "Control plane",
      items: adminNav.map((item) => ({
        href: item.href,
        label: item.title,
        icon: item.icon,
      })),
    },
  ];

  return (
    <SidebarShell
      user={session.user}
      nav={nav}
      brand={{ title: "OpenSolve", subtitle: "Admin", href: "/admin" }}
      environmentLabel="Admin Control Room"
      headerBadge={
        <Badge variant="secondary" className="bg-rose-500/10 text-rose-500">
          God mode
        </Badge>
      }
      sidebarFooter={
        <div className="space-y-2 text-xs text-muted-foreground">
          <p>Need to broadcast a warning? Flip the system switch above.</p>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-2xl border border-border/60 px-3 py-2 font-medium text-muted-foreground transition hover:text-foreground"
          >
            Return to workspace
          </Link>
        </div>
      }
    >
      <div className="space-y-6">{children}</div>
    </SidebarShell>
  );
}
