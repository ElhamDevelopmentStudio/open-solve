import { siteConfig } from "@/config/site";
import { getSession } from "@/lib/auth/session";
import { cn } from "@/lib/utils";
import Link from "next/link";
import type { PropsWithChildren } from "react";

const navLinks = [
  { label: "Problems", href: "/problems" },
  { label: "Easy problems", href: "/difficulty/easy" },
  { label: "Docs", href: siteConfig.links.docs },
  { label: "GitHub", href: siteConfig.links.github },
];

export default async function ReaderLayout({ children }: PropsWithChildren) {
  const session = await getSession();
  const isLoggedIn = Boolean(session);

  return (
    <div className="relative min-h-screen bg-[#050505] text-foreground">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_20%,rgba(64,255,223,0.08),transparent_35%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_0%,rgba(132,94,247,0.08),transparent_40%)]"
      />

      <a href="#reader-main" className="skip-link sr-only focus:not-sr-only">
        Skip to content
      </a>

      <header className="sticky top-0 z-30 border-b border-white/10 bg-background/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4 lg:px-8">
          <Link
            href="/"
            className="text-base font-semibold tracking-tight text-foreground transition-colors hover:text-primary"
          >
            OpenSolve
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "transition-colors hover:text-primary",
                  link.href === "/problems" && "text-foreground",
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <Link
            href={isLoggedIn ? "/dashboard" : "/sign-in"}
            className="hidden rounded-full border border-white/20 px-3 py-1.5 text-xs font-medium text-white/80 transition-colors hover:bg-white/10 lg:inline-flex"
          >
            {isLoggedIn ? "Workspace" : "Sign in"}
          </Link>
        </div>
      </header>

      <main
        id="reader-main"
        className="relative z-10 mx-auto w-full max-w-6xl px-5 py-10 lg:px-8 lg:py-14"
      >
        <div className="space-y-10">{children}</div>
      </main>
    </div>
  );
}
