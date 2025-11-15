import { AppShell } from "@/components/layout";
import { AdminNav } from "@/components/admin/admin-nav";
import type { AdminNavItem } from "@/components/admin/admin-nav";
import { Button, ThemeToggle } from "@/components/ui";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import type { PropsWithChildren } from "react";
import Link from "next/link";
import { Shield } from "lucide-react";

const adminNav: AdminNavItem[] = [
  { title: "Overview", href: "/admin", icon: "dashboard" },
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

  const initials = session.user.handle?.slice(0, 2).toUpperCase() ?? "AD";

  return (
    <AppShell
      header={
        <div className="flex flex-col gap-4 border-b border-border/60 bg-card/60 px-6 py-4 text-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-primary">
              <Shield className="h-3.5 w-3.5" />
              God Mode
            </div>
            <h1 className="text-2xl font-semibold">Admin Control Room</h1>
            <p className="text-muted-foreground">
              Monitor and intervene across every subsystem in real time.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center rounded-xl border border-border/60 bg-background px-3 py-1.5 text-xs text-muted-foreground">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
                {initials}
              </span>
              <span className="ml-2">{session.user.email}</span>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/dashboard"
                className="rounded-full border border-border/70 px-3 py-1.5 text-xs text-muted-foreground transition hover:text-foreground"
              >
                Return to workspace
              </Link>
              <ThemeToggle />
            </div>
          </div>
        </div>
      }
      sidebar={
        <div className="flex h-full flex-col border-r border-border/40 bg-muted/10 px-4">
          <AdminNav items={adminNav} />
          <div className="mt-auto space-y-3 border-t border-border/50 py-4 text-xs text-muted-foreground">
            <p>Need to broadcast a warning?</p>
            <Button asChild size="sm" className="w-full">
              <Link href="/admin/system">Toggle maintenance</Link>
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-6">{children}</div>
    </AppShell>
  );
}
