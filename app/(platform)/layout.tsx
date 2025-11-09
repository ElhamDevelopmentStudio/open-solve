import { AppShell } from "@/components/layout";
import { Badge, Separator } from "@/components/ui";
import { dashboardNav } from "@/config/navigation";
import Link from "next/link";
import type { PropsWithChildren } from "react";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { isStaffRole } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

export default async function PlatformLayout({ children }: PropsWithChildren) {
  const session = await getSession();
  if (!session) {
    redirect("/sign-in");
  }
  const staffAccess = isStaffRole(session.user.role);
  return (
    <AppShell
      header={
        <div className="flex h-16 items-center justify-between px-6">
          <span className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            OpenSolve Workspace
          </span>
        </div>
      }
      sidebar={
        <nav className="flex flex-1 flex-col gap-2 p-4 text-sm text-muted-foreground">
          <p className="font-semibold text-foreground">Navigation</p>
          <Separator className="my-2" />
          <ul className="flex flex-col gap-1">
            {dashboardNav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex items-center justify-between rounded-md px-3 py-2 transition hover:bg-muted hover:text-foreground"
                >
                  <span>{item.title}</span>
                  {item.soon ? (
                    <Badge variant="outline" className="text-[10px] uppercase">
                      Soon
                    </Badge>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
          {staffAccess ? (
            <Link
              href="/staff/problems"
              className="mt-4 flex items-center justify-between rounded-md border border-white/5 px-3 py-2 text-xs font-medium text-emerald-300 transition hover:border-emerald-400/40"
            >
              Staff Console <span aria-hidden="true">↗</span>
            </Link>
          ) : null}
          <p className="mt-auto text-xs text-muted-foreground">You are signed in.</p>
        </nav>
      }
    >
      {children}
    </AppShell>
  );
}
