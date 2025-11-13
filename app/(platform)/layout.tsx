import { AppShell } from "@/components/layout";
import { Badge, Separator, ThemeToggle } from "@/components/ui";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { dashboardNav } from "@/config/navigation";
import { isStaffRole } from "@/lib/auth/permissions";
import { getSession } from "@/lib/auth/session";
import { Code2, Crown, User } from "lucide-react";
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
  const userInitials = session.user.email?.slice(0, 2).toUpperCase() || "U";

  return (
    <AppShell
      header={
        <div className="flex h-14 items-center justify-between border-b border-border/60 bg-card/50 px-4 backdrop-blur-sm sm:px-6">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="flex items-center gap-2.5 transition-opacity hover:opacity-80">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-primary to-primary/70 shadow-sm">
                <Code2 className="h-4 w-4 text-primary-foreground" />
              </div>
              <div className="hidden sm:block">
                <span className="text-sm font-semibold tracking-tight">OpenSolve</span>
              </div>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/settings/profile">
              <Button variant="ghost" size="sm" className="h-8 w-8 rounded-full p-0">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </Link>
          </div>
        </div>
      }
      sidebar={
        <nav className="flex h-full flex-col p-3">
          <div className="flex-1 space-y-1">
            {dashboardNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group relative flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium text-foreground/70 transition-all hover:bg-accent hover:text-foreground"
              >
                <span>{item.title}</span>
                {item.soon ? (
                  <Badge variant="secondary" className="text-[10px] font-medium">
                    Soon
                  </Badge>
                ) : null}
              </Link>
            ))}
          </div>

          {staffAccess ? (
            <>
              <Separator className="my-3" />
              <Link
                href="/staff/problems"
                className="flex items-center gap-2.5 rounded-md bg-gradient-to-r from-primary/10 to-primary/5 px-3 py-2 text-sm font-medium text-primary transition-all hover:from-primary/15 hover:to-primary/10"
              >
                <Crown className="h-4 w-4" />
                <span>Staff Console</span>
              </Link>
            </>
          ) : null}

          <div className="mt-auto border-t border-border/60 pt-3">
            <Link
              href="/settings/profile"
              className="flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-accent"
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-xs font-medium">{session.user.email}</p>
                <p className="text-xs text-muted-foreground">@{session.user.handle}</p>
              </div>
              <User className="h-4 w-4 text-muted-foreground" />
            </Link>
          </div>
        </nav>
      }
    >
      <div className="min-h-[calc(100vh-3.5rem)] bg-background p-4 sm:p-6">{children}</div>
    </AppShell>
  );
}
