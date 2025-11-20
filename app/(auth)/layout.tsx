import Link from "next/link";
import type { PropsWithChildren } from "react";
import { redirect } from "next/navigation";

import { CommandPalette } from "@/components/marketing/command-palette";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { CheckCircle2, Code2, Sparkles } from "@/components/icons";
import { authConfig } from "@/config/auth";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function AuthLayout({ children }: PropsWithChildren) {
  const session = await getSession();
  if (session) {
    redirect("/dashboard");
  }

  const { layout } = authConfig;

  return (
    <>
      <CommandPalette />
      <div className="min-h-screen bg-background text-foreground">
        <header className="border-b border-border/70 bg-background/95 backdrop-blur-sm">
          <div className="mx-auto flex max-w-screen-2xl items-center justify-between px-6 py-4 lg:px-12">
            <Link href="/" className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-none border-2 border-primary bg-linear-to-br from-primary/15 to-transparent">
                <Code2 className="h-5 w-5 text-primary" />
              </div>
              <div className="flex flex-col leading-tight">
                <span className="font-mono text-sm font-bold uppercase tracking-tight">
                  OpenSolve
                </span>
                <span className="font-mono text-[11px] uppercase text-muted-foreground">
                  {layout.badge}
                </span>
              </div>
            </Link>
            <div className="flex items-center gap-3">
              <kbd className="rounded-none border border-border px-2 py-1 font-mono text-xs">
                ⌘K
              </kbd>
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main className="mx-auto flex max-w-screen-2xl flex-col gap-8 px-6 py-10 lg:px-12 lg:py-14">
          <div className="grid gap-8 lg:grid-cols-[28rem_1fr]">
            <aside className="flex flex-col gap-5 border-2 border-border bg-background/90 p-6 shadow-primary/20">
              <div className="inline-flex items-center gap-2 border-2 border-primary/50 px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-primary">
                <Sparkles className="h-4 w-4" />
                Secure entry
              </div>
              <h2 className="bg-linear-to-br from-foreground via-foreground to-foreground/70 bg-clip-text font-mono text-3xl font-black leading-tight text-transparent">
                {layout.headline}
              </h2>
              <p className="font-mono text-sm text-muted-foreground">{layout.tagline}</p>
              <div className="space-y-3 border-2 border-border p-4">
                <div className="font-mono text-xs font-bold uppercase text-primary/80">
                  [00] Platform pulse
                </div>
                <div className="grid gap-px bg-border/40">
                  {layout.stats.map((stat) => (
                    <div
                      key={stat.label}
                      className="flex items-center justify-between bg-background px-3 py-2 text-sm"
                    >
                      <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                        {stat.label}
                      </span>
                      <span className="font-mono text-sm font-bold">{stat.value}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  Authentication is audited and contest-safe by design.
                </div>
              </div>
            </aside>

            <section className="space-y-8">{children}</section>
          </div>
        </main>
      </div>
    </>
  );
}
