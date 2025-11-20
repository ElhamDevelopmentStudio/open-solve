import { ArrowRight, Code2, Github } from "@/components/icons";
import { CommandPalette } from "@/components/marketing/command-palette";
import { SplitEditor } from "@/components/marketing/split-editor";
import { ThemeToggleLanding } from "@/components/marketing/theme-toggle-landing";
import { Button } from "@/components/ui";
import { landingConfig } from "@/config/landing";
import { siteConfig } from "@/config/site";
import Link from "next/link";

export const revalidate = 21600;

export default function Home() {
  return (
    <>
      <CommandPalette />

      <div className="min-h-screen bg-background text-foreground">
        <nav className="fixed left-0 right-0 top-0 z-40 border-b border-border/50 bg-background/90 backdrop-blur-sm">
          <div className="mx-auto flex max-w-screen-2xl items-center justify-between px-6 py-4 lg:px-12">
            <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-80">
              <div className="flex h-7 w-7 items-center justify-center rounded-none border-2 border-primary bg-linear-to-br from-primary/20 to-primary/5">
                <Code2 className="h-4 w-4 text-primary" />
              </div>
              <span className="font-mono text-lg font-bold text-foreground">{siteConfig.name}</span>
            </Link>

            <div className="flex items-center gap-4">
              <Link
                href="/problems"
                className="hidden font-mono text-sm text-muted-foreground transition-colors hover:text-primary md:inline-block"
              >
                problems
              </Link>
              <Link
                href="/contests"
                className="hidden font-mono text-sm text-muted-foreground transition-colors hover:text-primary md:inline-block"
              >
                contests
              </Link>
              <Link
                href={siteConfig.links.github}
                className="font-mono text-sm text-muted-foreground transition-colors hover:text-primary"
              >
                <Github className="h-5 w-5" />
              </Link>
              <ThemeToggleLanding />
              <button className="group font-mono text-xs text-muted-foreground transition-colors hover:text-primary">
                <span className="hidden sm:inline">Press </span>
                <kbd className="rounded-none border border-border px-2 py-1">⌘K</kbd>
                <span className="hidden sm:inline"> to navigate</span>
              </button>
            </div>
          </div>
        </nav>

        <main className="mx-auto max-w-screen-2xl px-6 pt-24 lg:px-12">
          <section className="grid gap-12 py-24 lg:grid-cols-12 lg:py-32">
            <div className="flex flex-col justify-center lg:col-span-5">
              <div className="mb-6 inline-flex items-center gap-2 font-mono text-xs text-primary/80">
                <span className="h-2 w-2 animate-pulse rounded-full bg-primary shadow-sm shadow-primary/50" />
                {landingConfig.hero.badge}
              </div>

              <h1 className="mb-8 bg-linear-to-br from-foreground via-foreground to-foreground/70 bg-clip-text font-mono text-6xl font-black leading-[1.05] tracking-tighter text-transparent sm:text-7xl lg:text-8xl">
                {landingConfig.hero.headline.line1}
                <br />
                {landingConfig.hero.headline.line2}
                <br />
                <span className="bg-linear-to-r from-primary via-primary to-primary/70 bg-clip-text text-transparent">
                  {landingConfig.hero.headline.line3}
                </span>
              </h1>

              <p className="mb-12 max-w-lg font-mono text-base leading-relaxed text-muted-foreground sm:text-lg">
                {landingConfig.hero.description}
              </p>

              <div className="flex flex-wrap items-center gap-4">
                <Button
                  asChild
                  className="group h-14 rounded-none border-2 border-primary bg-primary px-8 font-mono text-base font-bold text-primary-foreground shadow-sm shadow-primary/20 transition-all hover:shadow-md hover:shadow-primary/30"
                >
                  <Link href="/sign-up" className="inline-flex items-center gap-2">
                    START FREE
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="h-14 rounded-none border-2 border-border bg-transparent px-8 font-mono text-base text-foreground hover:border-primary/50 hover:bg-accent"
                >
                  <Link href="/problems">BROWSE 2000+ PROBLEMS</Link>
                </Button>
              </div>

              <div className="mt-12 grid grid-cols-3 gap-6 border-t border-border pt-8">
                {landingConfig.stats.map((stat) => (
                  <div key={stat.label}>
                    <div className="bg-linear-to-r from-primary to-primary/70 bg-clip-text font-mono text-3xl font-bold text-transparent">
                      {stat.value}
                    </div>
                    <div className="mt-1 font-mono text-xs text-muted-foreground">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-7">
              <div className="overflow-hidden rounded-none border-2 border-border shadow-2xl shadow-primary/5">
                <SplitEditor />
              </div>
            </div>
          </section>

          <section className="border-t border-border py-24 lg:py-32">
            <div className="mb-16 grid gap-8 lg:grid-cols-2 lg:gap-16">
              <div>
                <div className="mb-4 font-mono text-xs font-bold text-primary/80">
                  [01] WHY OPENSOLVE
                </div>
                <h2 className="bg-linear-to-br from-foreground via-foreground to-foreground/70 bg-clip-text font-mono text-4xl font-black leading-tight tracking-tight text-transparent sm:text-5xl lg:text-6xl">
                  {landingConfig.features.title}
                </h2>
              </div>
              <div className="flex items-end">
                <p className="max-w-xl font-mono text-base leading-relaxed text-muted-foreground">
                  {landingConfig.features.subtitle}
                </p>
              </div>
            </div>

            <div className="grid gap-px bg-border/30 sm:grid-cols-2 lg:grid-cols-3">
              {landingConfig.features.items.map((feature) => (
                <div
                  key={feature.num}
                  className="group relative overflow-hidden bg-background p-8 transition-all hover:bg-accent"
                >
                  <div className="absolute right-0 top-0 h-24 w-24 bg-linear-to-br from-primary/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                  <div className="relative z-10">
                    <div className="mb-4 font-mono text-xs font-bold text-primary/80">
                      [{feature.num}]
                    </div>
                    <h3 className="mb-4 font-mono text-xl font-bold text-foreground">
                      {feature.title}
                    </h3>
                    <p className="font-mono text-sm leading-relaxed text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="border-t border-border py-24 lg:py-32">
            <div className="mb-16">
              <div className="mb-4 font-mono text-xs font-bold text-primary/80">[02] THE STACK</div>
              <h2 className="bg-linear-to-br from-foreground via-foreground to-foreground/70 bg-clip-text font-mono text-4xl font-black leading-tight tracking-tight text-transparent sm:text-5xl lg:text-6xl">
                {landingConfig.techStack.title}
              </h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-8">
              {landingConfig.techStack.technologies.map((tech) => (
                <div
                  key={tech}
                  className="group relative overflow-hidden border-2 border-border bg-background p-6 text-center transition-all hover:border-primary/50 hover:bg-accent"
                >
                  <div className="absolute inset-0 bg-linear-to-br from-primary/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                  <span className="relative z-10 font-mono text-sm font-bold text-foreground">
                    {tech}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-12 border-2 border-primary/30 bg-primary/5 p-8 text-center shadow-inner shadow-primary/5">
              <p className="font-mono text-sm text-muted-foreground">
                {landingConfig.techStack.footer}
              </p>
            </div>
          </section>

          <section className="border-t border-border py-24 lg:py-32">
            <div className="relative overflow-hidden border-2 border-primary/50 bg-linear-to-br from-primary/5 via-background to-background p-12 shadow-2xl shadow-primary/10 lg:p-24">
              <div className="absolute right-0 top-0 h-96 w-96 bg-linear-to-br from-primary/10 to-transparent blur-3xl" />
              <div className="absolute bottom-0 left-0 h-96 w-96 bg-linear-to-tr from-primary/10 to-transparent blur-3xl" />

              <div className="relative z-10 mx-auto max-w-3xl text-center">
                <div className="mb-6 font-mono text-xs font-bold text-primary/80">
                  [03] GET STARTED
                </div>
                <h2 className="mb-8 bg-linear-to-br from-foreground via-foreground to-foreground/70 bg-clip-text font-mono text-4xl font-black leading-tight tracking-tight text-transparent sm:text-5xl lg:text-6xl">
                  {landingConfig.cta.title}
                </h2>
                <p className="mb-12 font-mono text-base text-muted-foreground sm:text-lg">
                  {landingConfig.cta.subtitle}
                </p>

                <div className="flex flex-wrap items-center justify-center gap-4">
                  <Button
                    asChild
                    className="h-16 rounded-none border-2 border-primary bg-primary px-12 font-mono text-lg font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:shadow-primary/30"
                  >
                    <Link href="/sign-up" className="inline-flex items-center gap-2">
                      CREATE ACCOUNT
                      <ArrowRight className="h-5 w-5" />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="h-16 rounded-none border-2 border-border bg-transparent px-12 font-mono text-lg font-bold text-foreground hover:border-primary/50 hover:bg-accent"
                  >
                    <Link href={siteConfig.links.github}>
                      <Github className="mr-2 h-5 w-5" />
                      STAR ON GITHUB
                    </Link>
                  </Button>
                </div>

                <div className="mt-12 flex flex-wrap items-center justify-center gap-8 font-mono text-xs text-muted-foreground">
                  {landingConfig.cta.benefits.map((benefit) => (
                    <div key={benefit.label} className="flex items-center gap-2">
                      <span className="text-primary">{benefit.icon}</span>
                      {benefit.label}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </main>

        <footer className="border-t border-border py-12">
          <div className="mx-auto max-w-screen-2xl px-6 lg:px-12">
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-none border-2 border-primary bg-linear-to-br from-primary/20 to-primary/5">
                    <Code2 className="h-3 w-3 text-primary" />
                  </div>
                  <span className="font-mono font-bold text-foreground">{siteConfig.name}</span>
                </div>
                <p className="font-mono text-xs text-muted-foreground">
                  Open-source algorithmic practice platform
                </p>
              </div>

              <div>
                <div className="mb-4 font-mono text-xs font-bold text-primary/80">PLATFORM</div>
                <nav className="space-y-2 font-mono text-xs">
                  <Link
                    href="/problems"
                    className="block text-muted-foreground transition-colors hover:text-primary"
                  >
                    Problems
                  </Link>
                  <Link
                    href="/contests"
                    className="block text-muted-foreground transition-colors hover:text-primary"
                  >
                    Contests
                  </Link>
                  <Link
                    href="/discuss"
                    className="block text-muted-foreground transition-colors hover:text-primary"
                  >
                    Discussions
                  </Link>
                  <Link
                    href="/leaderboards"
                    className="block text-muted-foreground transition-colors hover:text-primary"
                  >
                    Leaderboard
                  </Link>
                </nav>
              </div>

              <div>
                <div className="mb-4 font-mono text-xs font-bold text-primary/80">RESOURCES</div>
                <nav className="space-y-2 font-mono text-xs">
                  <Link
                    href={siteConfig.links.docs}
                    className="block text-muted-foreground transition-colors hover:text-primary"
                  >
                    Documentation
                  </Link>
                  <Link
                    href={siteConfig.links.github}
                    className="block text-muted-foreground transition-colors hover:text-primary"
                  >
                    GitHub
                  </Link>
                  <Link
                    href="/api"
                    className="block text-muted-foreground transition-colors hover:text-primary"
                  >
                    API
                  </Link>
                </nav>
              </div>

              <div>
                <div className="mb-4 font-mono text-xs font-bold text-primary/80">LEGAL</div>
                <nav className="space-y-2 font-mono text-xs">
                  <Link
                    href="/privacy"
                    className="block text-muted-foreground transition-colors hover:text-primary"
                  >
                    Privacy
                  </Link>
                  <Link
                    href="/terms"
                    className="block text-muted-foreground transition-colors hover:text-primary"
                  >
                    Terms
                  </Link>
                  <Link
                    href="/license"
                    className="block text-muted-foreground transition-colors hover:text-primary"
                  >
                    MIT License
                  </Link>
                </nav>
              </div>
            </div>

            <div className="mt-12 border-t border-border pt-8 text-center font-mono text-xs text-muted-foreground">
              © {new Date().getFullYear()} {siteConfig.name} · Built by developers, for developers
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
