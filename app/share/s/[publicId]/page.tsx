import Link from "next/link";
import { CommandPalette } from "@/components/marketing/command-palette";
import { SubmissionReadOnlyView } from "@/components/submissions/submission-detail";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Code2, Link as LinkIcon, ShieldCheck } from "@/components/icons";
import { sharedPageConfig } from "@/config/share";
import { createTRPCCaller } from "@/lib/trpc/server/caller";
import { notFound } from "next/navigation";

export default async function SharedSubmissionPage({
  params,
}: {
  params: { publicId: string } | Promise<{ publicId: string }>;
}) {
  const resolved = params instanceof Promise ? await params : params;
  const caller = await createTRPCCaller();
  let submission;
  try {
    submission = await caller.submissions.getShare({ publicId: resolved.publicId });
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error as { code?: string }).code === "NOT_FOUND"
    ) {
      notFound();
    }
    throw error;
  }

  return (
    <>
      <CommandPalette />
      <div className="min-h-screen bg-background text-foreground">
        <header className="border-b border-border/70 bg-background/90 backdrop-blur-sm">
          <div className="mx-auto flex max-w-screen-2xl items-center justify-between px-6 py-4 lg:px-12">
            <Link href="/" className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-none border-2 border-primary bg-linear-to-br from-primary/15 to-transparent">
                <Code2 className="h-5 w-5 text-primary" />
              </div>
              <div className="flex flex-col leading-none">
                <span className="font-mono text-sm font-bold uppercase tracking-tight">
                  OpenSolve
                </span>
                <span className="font-mono text-xs text-muted-foreground">
                  {sharedPageConfig.navTagline}
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

        <main className="mx-auto max-w-screen-2xl px-6 py-12 lg:px-12 lg:py-16">
          <section className="grid gap-8 lg:grid-cols-12">
            <div className="lg:col-span-4 space-y-6">
              <div className="flex flex-col gap-4 border-2 border-border bg-background p-6 shadow-primary/20">
                <div className="font-mono text-xs font-bold uppercase text-primary/80">
                  [01] {sharedPageConfig.badge}
                </div>
                <div className="space-y-3">
                  <h1 className="bg-linear-to-br from-foreground via-foreground to-foreground/70 bg-clip-text font-mono text-4xl font-black leading-tight text-transparent">
                    {sharedPageConfig.headline.line1}
                    <br />
                    <span className="bg-linear-to-r from-primary to-primary/70 bg-clip-text">
                      {sharedPageConfig.headline.line2}
                    </span>
                  </h1>
                  <p className="font-mono text-sm text-muted-foreground">
                    {sharedPageConfig.description}
                  </p>
                </div>
                <div className="grid gap-px bg-border/40 sm:grid-cols-2">
                  {sharedPageConfig.meta.map((item) => (
                    <div
                      key={item.label}
                      className="bg-background px-4 py-3 font-mono text-xs uppercase tracking-tight"
                    >
                      <div className="text-muted-foreground">{item.label}</div>
                      <div className="mt-1 text-sm font-bold">{item.value}</div>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link href={sharedPageConfig.ctas.primary.href}>
                    <Button className="h-11 px-6 font-mono text-sm font-bold">
                      {sharedPageConfig.ctas.primary.label}
                    </Button>
                  </Link>
                  <Link href={sharedPageConfig.ctas.secondary.href}>
                    <Button variant="outline" className="h-11 px-6 font-mono text-sm">
                      {sharedPageConfig.ctas.secondary.label}
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="space-y-3 border-2 border-border bg-background p-6">
                <div className="font-mono text-xs font-bold uppercase text-primary/80">
                  [02] {sharedPageConfig.integrityLabel}
                </div>
                <div className="space-y-3">
                  {sharedPageConfig.safety.map((item) => (
                    <div key={item.title} className="flex gap-3">
                      <div className="mt-0.5 h-2 w-2 bg-primary" />
                      <div className="space-y-1">
                        <div className="font-mono text-sm font-bold uppercase tracking-tight">
                          {item.title}
                        </div>
                        <p className="font-mono text-xs text-muted-foreground">{item.copy}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="lg:col-span-8 space-y-4">
              <div className="flex items-center justify-between border-2 border-border bg-background px-4 py-3 font-mono text-xs uppercase tracking-tight">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <span>{sharedPageConfig.viewer.title}</span>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <LinkIcon className="h-4 w-4" />
                  <span className="text-[11px]">{resolved.publicId}</span>
                </div>
              </div>
              <div className="border-2 border-border bg-background p-2 shadow-primary/10">
                <SubmissionReadOnlyView submission={submission} />
              </div>
            </div>
          </section>
        </main>
      </div>
    </>
  );
}
