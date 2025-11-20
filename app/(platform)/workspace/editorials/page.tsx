import Link from "next/link";

import { formatDistanceToNow } from "date-fns";
import { ArrowUpRight, FileText, Layers } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { workspaceHubConfig } from "@/config/workspace-hub";
import { prisma } from "@/lib/prisma";

async function getEditorialBacklog() {
  const problems = await prisma.problem.findMany({
    where: {
      deletedAt: null,
      state: "PUBLISHED",
      currentVersion: {
        editorial: { not: null },
      },
    },
    include: {
      currentVersion: { select: { title: true, editorial: true } },
      difficulty: { select: { code: true } },
      stats: { select: { acceptedCount: true, submissionCount: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 8,
  });
  return problems;
}

export default async function WorkspaceEditorialsPage() {
  const backlog = await getEditorialBacklog();
  const publishedCount = backlog.length;
  const acceptedTotal = backlog.reduce(
    (count, problem) => count + (problem.stats?.acceptedCount ?? 0),
    0,
  );
  const lastUpdatedLabel =
    backlog[0]?.updatedAt != null
      ? formatDistanceToNow(new Date(backlog[0].updatedAt), { addSuffix: true })
      : workspaceHubConfig.editorials.stats.empty;
  const metrics = [
    { label: workspaceHubConfig.editorials.stats.published, value: publishedCount.toString() },
    {
      label: workspaceHubConfig.editorials.stats.coverage,
      value: `${acceptedTotal.toLocaleString()} AC`,
    },
    { label: workspaceHubConfig.editorials.stats.freshness, value: lastUpdatedLabel },
  ];

  return (
    <div className="space-y-10 font-mono text-foreground">
      <section className="border-2 border-border bg-card p-6 md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.35em] text-primary/80">
              {workspaceHubConfig.editorials.marker}
              <span className="inline-flex items-center gap-2 border-2 border-border bg-background px-3 py-1 text-[10px] tracking-[0.25em] text-muted-foreground">
                <Layers className="h-4 w-4 text-primary" />
                {workspaceHubConfig.editorials.badge}
              </span>
            </div>
            <h1 className="text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
              {workspaceHubConfig.editorials.headline.line1}
              <br />
              {workspaceHubConfig.editorials.headline.line2}
              <br />
              <span className="bg-gradient-to-r from-primary via-primary to-primary/70 bg-clip-text text-transparent">
                {workspaceHubConfig.editorials.headline.line3}
              </span>
            </h1>
            <p className="max-w-3xl text-sm text-muted-foreground">
              {workspaceHubConfig.editorials.description}
            </p>
            <div className="flex flex-wrap gap-3">
              <Button
                asChild
                className="h-12 rounded-none border-2 border-primary bg-primary px-6 font-mono text-xs font-bold uppercase text-primary-foreground shadow-md shadow-primary/20 transition-all hover:shadow-lg hover:shadow-primary/30"
              >
                <Link href={workspaceHubConfig.editorials.actions.primary.href}>
                  {workspaceHubConfig.editorials.actions.primary.label}
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="h-12 rounded-none border-2 border-border bg-background px-6 font-mono text-xs font-bold uppercase text-foreground transition-all hover:border-primary/50 hover:bg-accent"
              >
                <Link
                  href={workspaceHubConfig.editorials.actions.secondary.href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {workspaceHubConfig.editorials.actions.secondary.label}
                </Link>
              </Button>
            </div>
          </div>
          <div className="grid w-full gap-3 sm:grid-cols-3 lg:max-w-md">
            {metrics.map((stat) => (
              <div
                key={stat.label}
                className="border-2 border-border bg-background px-4 py-3 text-left"
              >
                <p className="text-[11px] uppercase text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-black">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-primary/70">
              {workspaceHubConfig.editorials.backlog.marker}
            </p>
            <h2 className="text-3xl font-black tracking-tight">
              {workspaceHubConfig.editorials.backlog.title}
            </h2>
            <p className="text-sm text-muted-foreground">
              {workspaceHubConfig.editorials.backlog.description}
            </p>
          </div>
          <Badge className="rounded-none border-2 border-border bg-background px-3 py-1 font-mono text-[10px] font-bold uppercase">
            {backlog.length} {workspaceHubConfig.editorials.stats.published}
          </Badge>
        </div>

        {backlog.length === 0 ? (
          <div className="border-2 border-dashed border-border bg-background p-10 text-center text-sm text-muted-foreground">
            <p className="font-bold uppercase">
              {workspaceHubConfig.editorials.backlog.emptyTitle}
            </p>
            <p className="mt-2">{workspaceHubConfig.editorials.backlog.emptyDescription}</p>
          </div>
        ) : (
          <div className="grid gap-px bg-border/40 md:grid-cols-2">
            {backlog.map((problem) => (
              <Link
                key={problem.id}
                href={`/workspace/problems/${problem.slug}`}
                className="group relative flex h-full flex-col border-2 border-border bg-background p-6 transition-all hover:border-primary/50 hover:bg-accent"
              >
                <div className="absolute right-0 top-0 h-20 w-20 bg-gradient-to-br from-primary/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                <div className="relative z-10 flex items-start justify-between gap-3">
                  <div className="space-y-2">
                    <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
                      #{problem.slug}
                    </p>
                    <p className="text-xl font-black">
                      {problem.currentVersion?.title ?? problem.slug}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <FileText className="h-4 w-4 text-primary" />
                      {workspaceHubConfig.editorials.backlog.status}
                    </div>
                  </div>
                  <Badge className="rounded-none border-2 border-border bg-background px-3 py-1 font-mono text-[10px] font-bold uppercase">
                    {problem.difficulty?.code ?? "UNRATED"}
                  </Badge>
                </div>
                <div className="relative z-10 mt-6 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="font-bold text-primary">
                    {problem.stats?.acceptedCount ?? 0}{" "}
                    {workspaceHubConfig.editorials.backlog.acceptanceLabel}
                  </span>
                  <span className="h-4 w-px bg-border" />
                  <span>{problem.stats?.submissionCount ?? 0} submissions</span>
                  <span className="h-4 w-px bg-border" />
                  <span className="inline-flex items-center gap-2">
                    <ArrowUpRight className="h-4 w-4 text-primary" />
                    Updated {formatDistanceToNow(new Date(problem.updatedAt), { addSuffix: true })}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2 border-2 border-border bg-background px-4 py-3 text-xs text-muted-foreground">
          <Layers className="h-4 w-4 text-primary" />
          {workspaceHubConfig.editorials.backlog.footnote}
        </div>
      </section>
    </div>
  );
}
