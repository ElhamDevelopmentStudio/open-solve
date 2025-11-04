import { getSession } from "@/lib/auth/session";
import { Code2, Sparkles } from "@/components/icons";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { PropsWithChildren } from "react";

export const dynamic = "force-dynamic";

export default async function AuthLayout({ children }: PropsWithChildren) {
  const session = await getSession();
  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="relative flex min-h-screen">
      <div className="hidden w-2/5 bg-gradient-to-br from-primary/5 via-background to-purple-500/5 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div>
          <Link href="/" className="inline-flex items-center gap-2.5 text-xl font-bold tracking-tight">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Code2 className="h-5 w-5" />
            </div>
            OpenSolve
          </Link>
        </div>

        <div className="space-y-8">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="h-3 w-3" />
              For developers, by developers
            </div>
            <h2 className="max-w-md text-3xl font-bold leading-tight tracking-tight">
              Master algorithms through deliberate practice
            </h2>
            <p className="max-w-sm text-muted-foreground">
              Join a community of engineers solving problems, competing in contests, and sharpening their craft every day.
            </p>
          </div>

          <div className="space-y-4 border-l-2 border-border pl-6">
            <div>
              <div className="text-2xl font-bold">12,000+</div>
              <div className="text-sm text-muted-foreground">Active developers</div>
            </div>
            <div>
              <div className="text-2xl font-bold">500+</div>
              <div className="text-sm text-muted-foreground">Curated problems</div>
            </div>
            <div>
              <div className="text-2xl font-bold">50+</div>
              <div className="text-sm text-muted-foreground">Weekly contests</div>
            </div>
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          © 2025 OpenSolve. Built with care.
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center px-6 py-12 lg:px-12">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Link href="/" className="inline-flex items-center gap-2.5 text-xl font-bold tracking-tight">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Code2 className="h-5 w-5" />
              </div>
              OpenSolve
            </Link>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
