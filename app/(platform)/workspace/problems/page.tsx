import Link from "next/link";
import type { ReactNode } from "react";
import { renderProblemLibraryPage } from "@/components/problems/problem-library-page";
import { workspaceConfig } from "@/config/workspace";
import { problemSearchParams } from "@/lib/problems/search-params";
import type { ProblemFiltersInput } from "@/lib/trpc/router/problems";

const SORT_LABELS: Record<ProblemFiltersInput["sort"], string> = {
  relevance: "Relevance",
  newest: "Newest",
  difficulty: "Difficulty ↑",
  difficulty_desc: "Difficulty ↓",
};

export const dynamic = "force-dynamic";

export default async function WorkspaceProblemsPage({
  searchParams,
}: {
  searchParams:
    | Record<string, string | string[] | undefined>
    | Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const filters = (await problemSearchParams.parse(resolvedSearchParams)) as ProblemFiltersInput;
  const content = await renderProblemLibraryPage({
    searchParams: resolvedSearchParams,
    viewerHasSession: true,
    problemBasePath: "/workspace/problems",
  });

  const activeFilterCount =
    (filters.q ? 1 : 0) +
    filters.difficulty.length +
    filters.status.length +
    filters.tags.length +
    (filters.onlyWithEditorial ? 1 : 0);

  const stats = [
    { label: workspaceConfig.library.stats[0].label, value: activeFilterCount.toString() },
    {
      label: workspaceConfig.library.stats[1].label,
      value: SORT_LABELS[filters.sort ?? "newest"],
    },
    { label: workspaceConfig.library.stats[2].label, value: "SESSION" },
  ];

  return (
    <div className="space-y-10 font-mono text-foreground">
      <section className="border-2 border-border bg-card p-6 md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.35em] text-primary/70">
              {workspaceConfig.library.hero.marker}
              <span className="inline-flex items-center gap-2 border border-border px-3 py-1 text-[10px] tracking-[0.25em] text-muted-foreground">
                <span className="h-2 w-2 animate-pulse bg-primary" />
                {workspaceConfig.library.hero.badge}
              </span>
            </div>
            <h1 className="text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
              {workspaceConfig.library.hero.headline.line1}
              <br />
              {workspaceConfig.library.hero.headline.line2}
              <br />
              <span className="bg-gradient-to-r from-primary via-primary to-primary/70 bg-clip-text text-transparent">
                {workspaceConfig.library.hero.headline.line3}
              </span>
            </h1>
            <p className="max-w-3xl text-sm text-muted-foreground">
              {workspaceConfig.library.hero.description}
            </p>
            <div className="flex flex-wrap gap-3">
              <ButtonLink href={workspaceConfig.library.hero.primaryCta.href}>
                {workspaceConfig.library.hero.primaryCta.label}
              </ButtonLink>
              <ButtonLink href={workspaceConfig.library.hero.secondaryCta.href} variant="outline">
                {workspaceConfig.library.hero.secondaryCta.label}
              </ButtonLink>
            </div>
          </div>
          <div className="grid w-full gap-3 sm:grid-cols-3 lg:max-w-md">
            {stats.map((stat) => (
              <div key={stat.label} className="border border-border bg-background px-4 py-3">
                <p className="text-[11px] uppercase text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-black">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeader
          marker={workspaceConfig.library.filters.marker}
          title={workspaceConfig.library.filters.title}
          description={workspaceConfig.library.filters.description}
        />
        <div className="border-2 border-border bg-card p-4">{content}</div>
      </section>
    </div>
  );
}

function SectionHeader({
  marker,
  title,
  description,
}: {
  marker: string;
  title: string;
  description?: string;
}) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-primary/70">{marker}</p>
      <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <h2 className="text-3xl font-black tracking-tight">{title}</h2>
        {description ? (
          <p className="text-sm text-muted-foreground lg:max-w-3xl">{description}</p>
        ) : null}
      </div>
    </div>
  );
}

function ButtonLink({
  children,
  href,
  variant,
}: {
  children: ReactNode;
  href: string;
  variant?: "default" | "outline";
}) {
  const classes =
    variant === "outline"
      ? "border-2 border-border text-xs font-bold uppercase px-6 py-3"
      : "border-2 border-primary bg-primary text-primary-foreground text-xs font-bold uppercase px-6 py-3";
  return (
    <Link href={href} className={classes}>
      {children}
    </Link>
  );
}
