import { PropsWithChildren } from "react";
import { cn } from "@/lib/utils";

type AppShellProps = PropsWithChildren<{
  header?: React.ReactNode;
  sidebar?: React.ReactNode;
  className?: string;
}>;

export function AppShell({ children, className, header, sidebar }: AppShellProps) {
  return (
    <div className="relative flex min-h-screen bg-background text-foreground">
      {/* Subtle background gradients */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_10%_20%,rgba(59,130,246,0.04),transparent_40%)] dark:bg-[radial-gradient(circle_at_10%_20%,rgba(59,130,246,0.08),transparent_40%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_90%_80%,rgba(147,51,234,0.03),transparent_40%)] dark:bg-[radial-gradient(circle_at_90%_80%,rgba(147,51,234,0.06),transparent_40%)]"
      />

      {sidebar ? (
        <aside className="relative z-10 hidden w-72 border-r border-border/50 bg-card/60 backdrop-blur-xl lg:flex">
          <div className="flex w-full flex-col">{sidebar}</div>
        </aside>
      ) : null}

      <div className="relative z-10 flex min-h-screen flex-1 flex-col">
        {header ? (
          <header className="sticky top-0 z-20 border-b border-border/50 bg-background/80 backdrop-blur-xl supports-backdrop-filter:bg-background/60">
            {header}
          </header>
        ) : null}
        <main className={cn("flex-1 px-6 py-10 lg:px-10", className)}>{children}</main>
      </div>
    </div>
  );
}
