import { getSession } from "@/lib/auth/session";
import { isStaffRole } from "@/lib/auth/permissions";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { PropsWithChildren } from "react";
import { ThemeToggle } from "@/components/ui";
import { ArrowLeft, Code2, FileText, Shield, ClipboardList, Gavel } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function StaffLayout({ children }: PropsWithChildren) {
  const session = await getSession();
  if (!session || !isStaffRole(session.user.role)) {
    redirect("/sign-in");
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-6">
              <Link href="/dashboard" className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-primary to-secondary shadow-sm">
                  <Code2 className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">OpenSolve</span>
                    <Shield className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <span className="text-xs text-muted-foreground">Staff Console</span>
                </div>
              </Link>
              <nav className="hidden items-center gap-1 md:flex">
                <Link
                  href="/staff/problems"
                  className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  <FileText className="h-4 w-4" />
                  <span>Problems</span>
                </Link>
                <Link
                  href="/staff/proposals"
                  className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  <ClipboardList className="h-4 w-4" />
                  <span>Proposals</span>
                </Link>
                <Link
                  href="/staff/judge/manual"
                  className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  <Gavel className="h-4 w-4" />
                  <span>Judge</span>
                </Link>
              </nav>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/dashboard"
                className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </Link>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">{children}</main>
      <footer className="border-t">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <p>{session.user.email}</p>
            <Link href="/problems" className="hover:text-foreground">
              View Public Site
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
