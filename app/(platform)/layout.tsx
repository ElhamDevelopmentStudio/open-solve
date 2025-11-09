import { AppShell } from "@/components/layout";
import { Badge, Separator, ThemeToggle } from "@/components/ui";
import { dashboardNav } from "@/config/navigation";
import Link from "next/link";
import type { PropsWithChildren } from "react";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { isStaffRole } from "@/lib/auth/permissions";
import { Code2, LayoutDashboard, Shield, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export const dynamic = "force-dynamic";

export default async function PlatformLayout({ children }: PropsWithChildren) {
  const session = await getSession();
  if (!session) {
    redirect("/sign-in");
  }
  const staffAccess = isStaffRole(session.user.role);
  const userInitials = session.user.email?.slice(0, 2).toUpperCase() || "U";

  return (
    <AppShell
      header={
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-primary to-secondary shadow-md">
              <Code2 className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight">OpenSolve</h1>
              <p className="text-xs text-muted-foreground">Workspace</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="icon" className="rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </div>
        </div>
      }
      sidebar={
        <nav className="flex flex-1 flex-col p-3">
          <ul className="space-y-1">
            {dashboardNav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="group flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-accent hover:text-foreground"
                >
                  <span>{item.title}</span>
                  {item.soon ? (
                    <Badge variant="secondary" className="text-[10px]">
                      Soon
                    </Badge>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>

          {/* Staff Access */}
          {staffAccess ? (
            <>
              <Separator className="my-3" />
              <Link
                href="/staff/problems"
                className="flex items-center gap-2 rounded-md bg-primary/10 px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/15"
              >
                <Shield className="h-4 w-4" />
                <span>Staff Console</span>
              </Link>
            </>
          ) : null}

          {/* User Info at Bottom */}
          <div className="mt-auto border-t pt-3">
            <div className="flex items-center gap-3 rounded-md px-2 py-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-xs font-medium">{session.user.email}</p>
                <p className="text-xs text-muted-foreground">Online</p>
              </div>
            </div>
          </div>
        </nav>
      }
    >
      {children}
    </AppShell>
  );
}
