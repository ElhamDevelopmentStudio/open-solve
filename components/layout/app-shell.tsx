import { PropsWithChildren } from "react";
import { cn } from "@/lib/utils";

type AppShellProps = PropsWithChildren<{
  header?: React.ReactNode;
  sidebar?: React.ReactNode;
  className?: string;
}>;

export function AppShell({ children, className, header, sidebar }: AppShellProps) {
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {sidebar ? (
        <aside className="hidden w-72 border-r border-border bg-card/40 lg:flex">
          <div className="flex w-full flex-col">{sidebar}</div>
        </aside>
      ) : null}

      <div className="flex min-h-screen flex-1 flex-col">
        {header ? (
          <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur">
            {header}
          </header>
        ) : null}
        <main className={cn("flex-1 px-6 py-10 lg:px-10", className)}>{children}</main>
      </div>
    </div>
  );
}
