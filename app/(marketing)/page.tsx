import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { siteConfig } from "@/config/site";
import Link from "next/link";

export const revalidate = 21600;

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-background via-background to-background">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6 lg:px-10">
        <div className="flex items-center gap-2">
          <span className="text-base font-semibold">{siteConfig.name}</span>
          <Badge variant="outline">Pre-alpha</Badge>
        </div>
        <nav className="flex items-center gap-3 text-sm text-muted-foreground">
          <Link href={siteConfig.links.docs}>Docs</Link>
          <Link href={siteConfig.links.github}>GitHub</Link>
        </nav>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-16 px-6 pb-24 pt-12 lg:px-10">
        <section className="max-w-3xl space-y-6">
          <Badge className="inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Built for the community
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Open-source practice platform for interviews, contests, and teams.
          </h1>
          <p className="text-lg text-muted-foreground">{siteConfig.description}</p>
          <div className="flex flex-wrap items-center gap-3">
            <Button asChild>
              <Link href="/sign-in">Get started</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={siteConfig.links.github}>Star on GitHub</Link>
            </Button>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Self-host ready</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>Next.js + PostgreSQL + Prisma foundation with strict TypeScript.</p>
              <p>Docker-first workflow and seeds prepared for future automation.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Extensible core</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>React Query providers, UI primitives, and modular layouts pre-wired.</p>
              <p>Plug in judging services, auth strategies, and AI helpers incrementally.</p>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
