import { ReaderMobileNav } from "@/components/layout/reader-mobile-nav";
import { ThemeToggle } from "@/components/ui";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import { getSession } from "@/lib/auth/session";
import { cn } from "@/lib/utils";
import { CodeIcon } from "hugeicons-react";
import Link from "next/link";
import type { PropsWithChildren } from "react";

const navLinks = [
  { label: "Problems", href: "/problems" },
  { label: "Discussions", href: "/discuss" },
  { label: "Tags", href: "/tags" },
  { label: "Leaderboards", href: "/leaderboards" },
  { label: "Docs", href: siteConfig.links.docs },
  { label: "GitHub", href: siteConfig.links.github, external: true },
];

export default async function ReaderLayout({ children }: PropsWithChildren) {
  const session = await getSession();
  const isLoggedIn = Boolean(session);

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      {/* Decorative background gradients */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(59,130,246,0.06),transparent_50%)] dark:bg-[radial-gradient(circle_at_20%_30%,rgba(59,130,246,0.12),transparent_50%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_80%_10%,rgba(147,51,234,0.05),transparent_50%)] dark:bg-[radial-gradient(circle_at_80%_10%,rgba(147,51,234,0.1),transparent_50%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_90%,rgba(6,182,212,0.04),transparent_50%)] dark:bg-[radial-gradient(circle_at_50%_90%,rgba(6,182,212,0.08),transparent_50%)]"
      />

      <a href="#reader-main" className="skip-link sr-only focus:not-sr-only">
        Skip to content
      </a>

      <header className="sticky top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link
            href="/"
            className="group flex items-center gap-2 text-base font-bold tracking-tight transition-all hover:scale-105"
          >
            <div className="flex h-8 w-8 items-center justify-center bg-linear-to-br from-primary to-secondary shadow-lg shadow-primary/20 transition-shadow group-hover:shadow-primary/40">
              <CodeIcon className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <span className="bg-linear-to-r from-primary to-secondary bg-clip-text text-transparent">
              OpenSolve
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                target={link.external ? "_blank" : undefined}
                rel={link.external ? "noopener noreferrer" : undefined}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium transition-all",
                  link.href === "/problems"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right side actions */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {isLoggedIn ? (
              <Button
                asChild
                size="sm"
                className="hidden shadow-lg shadow-primary/20 lg:inline-flex"
              >
                <Link href="/dashboard">Workspace</Link>
              </Button>
            ) : (
              <Button asChild variant="outline" size="sm" className="hidden lg:inline-flex">
                <Link href="/sign-in">Sign in</Link>
              </Button>
            )}
            <ReaderMobileNav links={navLinks} isLoggedIn={isLoggedIn} />
          </div>
        </div>
      </header>

      <main
        id="reader-main"
        className="relative z-10 mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12"
      >
        <div className="space-y-8">{children}</div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/40 bg-card/30 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} OpenSolve. Crafted with care.
            </p>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <Link href="/about" className="transition-colors hover:text-foreground">
                About
              </Link>
              <Link href="/privacy" className="transition-colors hover:text-foreground">
                Privacy
              </Link>
              <Link href="/terms" className="transition-colors hover:text-foreground">
                Terms
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
