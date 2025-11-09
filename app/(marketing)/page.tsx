import { Badge, Button, Card, CardContent, CardHeader, CardTitle, ThemeToggle } from "@/components/ui";
import { siteConfig } from "@/config/site";
import Link from "next/link";
import { Code2, Sparkles } from "lucide-react";

export const revalidate = 21600;

export default function Home() {
  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      {/* Background gradients */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.08),transparent_50%)] dark:bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.15),transparent_50%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_70%_60%,rgba(147,51,234,0.06),transparent_50%)] dark:bg-[radial-gradient(circle_at_70%_60%,rgba(147,51,234,0.12),transparent_50%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_100%,rgba(6,182,212,0.05),transparent_50%)] dark:bg-[radial-gradient(circle_at_50%_100%,rgba(6,182,212,0.1),transparent_50%)]"
      />

      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6 lg:px-10">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-linear-to-br from-primary to-secondary shadow-md">
            <Code2 className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-linear-to-r from-primary to-secondary bg-clip-text text-base font-bold text-transparent">{siteConfig.name}</span>
            <Badge variant="outline" className="text-xs">Pre-alpha</Badge>
          </div>
        </div>
        <nav className="flex items-center gap-2 text-sm">
          <Link href={siteConfig.links.docs} className="text-muted-foreground transition-colors hover:text-foreground">Docs</Link>
          <Link href={siteConfig.links.github} className="text-muted-foreground transition-colors hover:text-foreground">GitHub</Link>
          <ThemeToggle />
        </nav>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col gap-20 px-6 pb-24 pt-16 lg:px-10">
        <section className="max-w-3xl space-y-8">
          <Badge className="inline-flex items-center gap-2 shadow-sm">
            <Sparkles className="h-3 w-3" />
            Built for the community
          </Badge>
          <h1 className="text-5xl font-bold tracking-tight text-foreground sm:text-6xl lg:text-7xl">
            Open-source practice platform for{" "}
            <span className="bg-linear-to-r from-primary to-secondary bg-clip-text text-transparent">
              interviews
            </span>
            , contests, and teams.
          </h1>
          <p className="text-xl leading-relaxed text-muted-foreground">{siteConfig.description}</p>
          <div className="flex flex-wrap items-center gap-4">
            <Button asChild size="lg" className="rounded-full shadow-lg shadow-primary/20">
              <Link href="/sign-in">Get started →</Link>
            </Button>
            <Button variant="outline" asChild size="lg" className="rounded-full">
              <Link href={siteConfig.links.github}>Star on GitHub</Link>
            </Button>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm transition-all hover:shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl">Self-host ready</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
              <p>Next.js + PostgreSQL + Prisma foundation with strict TypeScript.</p>
              <p>Docker-first workflow and seeds prepared for future automation.</p>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm transition-all hover:shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl">Extensible core</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
              <p>React Query providers, UI primitives, and modular layouts pre-wired.</p>
              <p>Plug in judging services, auth strategies, and AI helpers incrementally.</p>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
