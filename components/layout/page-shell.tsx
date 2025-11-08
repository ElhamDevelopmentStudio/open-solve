import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type PageShellProps = {
  children: ReactNode;
  className?: string;
  width?: "md" | "lg" | "xl";
};

export function PageShell({ children, className, width = "xl" }: PageShellProps) {
  const widths: Record<NonNullable<PageShellProps["width"]>, string> = {
    md: "max-w-3xl",
    lg: "max-w-5xl",
    xl: "max-w-6xl",
  };
  const widthClass = widths[width];
  return (
    <div className={cn("relative isolate px-4 pb-16 pt-[calc(2rem+env(safe-area-inset-top))] sm:px-6 lg:px-10", className)}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.15),transparent_65%)] dark:bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.35),transparent_70%)]"
      />
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_90%_20%,rgba(6,182,212,0.18),transparent_55%)] opacity-80 blur-3xl" />
      <div className="relative mx-auto flex w-full flex-col gap-10">
        <div className={cn("mx-auto w-full", widthClass)}>{children}</div>
      </div>
    </div>
  );
}

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  stats?: ReactNode;
};

export function PageHeader({ eyebrow, title, description, actions, stats }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-6 rounded-3xl border border-border/60 bg-gradient-to-br from-card via-card/80 to-accent/40 p-6 shadow-[0_30px_120px_rgba(15,23,42,0.12)] dark:from-card/80 dark:via-card/50 dark:to-foreground/5 lg:flex-row lg:items-center lg:justify-between">
      <div className="space-y-3">
        {eyebrow ? <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{eyebrow}</p> : null}
        <div className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{title}</h1>
          {description ? <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">{description}</p> : null}
        </div>
        {stats ? <div className="grid gap-4 sm:grid-cols-2">{stats}</div> : null}
      </div>
      {actions ? <div className="flex flex-none flex-col gap-3 text-right">{actions}</div> : null}
    </div>
  );
}

type SurfaceProps = {
  children: ReactNode;
  className?: string;
  bleed?: boolean;
};

export function Surface({ children, className, bleed }: SurfaceProps) {
  return (
    <section
      className={cn(
        "rounded-3xl border border-border/80 bg-card/90 shadow-[0_30px_120px_rgba(15,23,42,0.08)] ring-1 ring-black/[0.02] backdrop-blur",
        bleed ? "px-0 py-0" : "p-6",
        className,
      )}
    >
      {children}
    </section>
  );
}

type SectionHeaderProps = {
  title: string;
  description?: string;
  action?: ReactNode;
};

export function SectionHeader({ title, description, action }: SectionHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-lg font-medium tracking-tight text-foreground">{title}</h2>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action ? <div className="flex-none">{action}</div> : null}
    </div>
  );
}
