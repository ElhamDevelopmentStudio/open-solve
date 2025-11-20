import type { ComponentProps, ComponentType } from "react";
import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import type { inferRouterOutputs } from "@trpc/server";
import { ProblemProposalStatus } from "@prisma/client";
import {
  ArrowRight05Icon,
  Award02Icon,
  Calendar02Icon,
  Megaphone01Icon,
  SparklesIcon,
  Target01Icon,
} from "hugeicons-react";

import { dashboardConfig } from "@/config/dashboard";
import {
  RecentSubmissionsTable,
  type RecentSubmissionRow,
} from "@/components/dashboard/recent-submissions-table";
import {
  SubmissionOutcomeChart,
  type SubmissionOutcomeDatum,
} from "@/components/dashboard/submission-outcome-chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/auth/session";
import type { AppRouter } from "@/lib/trpc/router";
import { createTRPCCaller } from "@/lib/trpc/server/caller";
import { cn } from "@/lib/utils";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type SubmissionSnapshot = RouterOutputs["submissions"]["listMine"];
type ProposalEntry = RouterOutputs["proposals"]["listMine"][number];
type ContestOverviewResponse = RouterOutputs["contests"]["overview"];
type ProposalStatKey = (typeof dashboardConfig.sections.activity.proposals.stats)[number]["key"];
type ProposalStats = Record<ProposalStatKey, number>;
type SubmissionEntry = SubmissionSnapshot["items"][number];
type ContestPreview =
  | ContestOverviewResponse["upcoming"][number]
  | ContestOverviewResponse["live"][number]
  | NonNullable<ContestOverviewResponse["featured"]>;

const ACCEPTED_CODES = new Set(["AC", "MANUAL_ACCEPTED"]);

export default async function DashboardPage() {
  const session = await getSession();
  const caller = await createTRPCCaller();

  const [submissionSnapshot, contestOverview, proposals, problemList] = await Promise.all([
    caller.submissions.listMine({ limit: 8, contest: "all", sort: "recent" }),
    caller.contests.overview(),
    caller.proposals.listMine(),
    caller.problems.list({
      q: "",
      difficulty: [],
      status: [],
      tags: [],
      onlyWithEditorial: false,
      sort: "newest",
      page: 1,
    }),
  ]);

  const submissionSummary = ensureSubmissionSummary(submissionSnapshot);
  const acceptanceRate =
    submissionSummary.totalAttempts > 0
      ? Math.round((submissionSummary.acceptedAttempts / submissionSummary.totalAttempts) * 100)
      : 0;
  const nextContest =
    contestOverview.featured ?? contestOverview.upcoming[0] ?? contestOverview.live[0] ?? null;
  const practiceDeck = problemList.items.slice(0, 4);
  const submissionRows: RecentSubmissionRow[] = submissionSnapshot.items.map((item) => ({
    id: item.id,
    createdAt: item.createdAt.toISOString(),
    verdictCode: item.verdictCode,
    status: item.status,
    runtimeMs: item.runtimeMs,
    memoryKb: item.memoryKb,
    languageCode: item.languageCode,
    languageDisplayName: item.languageDisplayName,
    problem: {
      slug: item.problem.slug,
      title: item.problem.title ?? item.problem.slug,
      difficulty: item.problem.difficulty ?? null,
    },
    contest: item.contest ? { slug: item.contest.slug, name: item.contest.name } : null,
  }));

  const proposalStats = summarizeProposals(proposals);
  const heroHighlights = [
    {
      label: dashboardConfig.hero.highlights.solved,
      value: submissionSummary.solvedProblems.toString(),
      meta: `${submissionSummary.acceptedAttempts} ${dashboardConfig.metrics.solved.metaSuffix}`,
    },
    {
      label: dashboardConfig.hero.highlights.acceptance,
      value: `${acceptanceRate}%`,
      meta: `${submissionSummary.totalAttempts} ${dashboardConfig.metrics.acceptance.metaSuffix}`,
    },
    {
      label: dashboardConfig.hero.highlights.contest,
      value: nextContest ? nextContest.name : dashboardConfig.emptyStates.contests.title,
      meta: nextContest
        ? formatDistanceToNow(new Date(nextContest.startsAt), { addSuffix: true })
        : dashboardConfig.hero.highlights.contestFallback,
    },
  ];
  const operatorName = session?.user.name ?? session?.user.handle ?? "solver";

  const metrics = [
    {
      label: dashboardConfig.metrics.solved.label,
      value: submissionSummary.solvedProblems.toString(),
      meta: `${submissionSummary.acceptedAttempts} ${dashboardConfig.metrics.solved.metaSuffix}`,
      icon: Target01Icon,
      accent: "text-success",
    },
    {
      label: dashboardConfig.metrics.acceptance.label,
      value: `${acceptanceRate}%`,
      meta: `${submissionSummary.totalAttempts} ${dashboardConfig.metrics.acceptance.metaSuffix}`,
      icon: SparklesIcon,
      accent: "text-info",
    },
    {
      label: dashboardConfig.metrics.manual.label,
      value: submissionSummary.manualPending.toString(),
      meta:
        submissionSummary.manualPending > 0
          ? dashboardConfig.metrics.manual.pending
          : dashboardConfig.metrics.manual.idle,
      icon: Megaphone01Icon,
      accent: "text-warning",
    },
    {
      label: dashboardConfig.metrics.performance.label,
      value: submissionSummary.fastestRuntimeMs ? `${submissionSummary.fastestRuntimeMs} ms` : "—",
      meta: submissionSummary.bestMemoryKb
        ? `${dashboardConfig.metrics.performance.memoryLabel}: ${submissionSummary.bestMemoryKb} kb`
        : dashboardConfig.metrics.performance.fallback,
      icon: ArrowRight05Icon,
      accent: "text-primary",
    },
  ];
  const submissionOutcomeSeries = buildSubmissionOutcomeSeries(submissionSnapshot.items);

  return (
    <div className="space-y-12 pb-16 font-mono text-foreground">
      <section className="grid gap-8 border-2 border-border bg-card px-6 py-8 shadow-md shadow-primary/15 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.4em] text-primary/80">
              {dashboardConfig.hero.marker}
            </p>
            <div className="mt-4 inline-flex items-center gap-3 border border-border bg-background px-3 py-2 text-[11px] font-bold uppercase tracking-[0.3em] text-muted-foreground">
              <span className="h-2 w-2 animate-pulse bg-primary" />
              {dashboardConfig.hero.badge}
            </div>
          </div>
          <h1 className="bg-gradient-to-br from-foreground via-foreground to-foreground/70 bg-clip-text text-4xl font-black tracking-tight text-transparent sm:text-5xl lg:text-6xl">
            {dashboardConfig.hero.headline.line1} <br />
            {dashboardConfig.hero.headline.line2} <br />
            <span className="bg-gradient-to-r from-primary via-primary to-primary/70 bg-clip-text text-transparent">
              {dashboardConfig.hero.headline.line3}
            </span>
          </h1>
          <p className="text-base text-muted-foreground">{dashboardConfig.hero.description}</p>
          <p className="text-xs font-bold uppercase text-muted-foreground">
            Operator: {operatorName}
          </p>
          <div className="flex flex-wrap gap-4">
            <Button asChild className="h-14 px-8 text-base font-bold">
              <Link href={dashboardConfig.hero.ctas.primary.href}>
                {dashboardConfig.hero.ctas.primary.label}
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="h-14 border-2 border-border px-8 text-base font-bold hover:border-primary/60"
            >
              <Link href={dashboardConfig.hero.ctas.secondary.href}>
                {dashboardConfig.hero.ctas.secondary.label}
              </Link>
            </Button>
          </div>
          <div className="grid gap-px bg-border/50 sm:grid-cols-3">
            {heroHighlights.map((highlight) => (
              <HighlightTile key={highlight.label} {...highlight} />
            ))}
          </div>
          <div className="grid gap-px bg-border/50 md:grid-cols-3">
            {dashboardConfig.quickActions.map((action) => (
              <QuickActionLink key={action.href} {...action} />
            ))}
          </div>
        </div>
        <div className="flex flex-col border-2 border-border bg-background p-6">
          <p className="text-xs font-bold uppercase text-muted-foreground">
            {dashboardConfig.hero.summaryLabel}
          </p>
          <p className="mt-3 text-3xl font-black tracking-tight">
            {submissionSummary.lastSubmissionAt
              ? formatDistanceToNow(submissionSummary.lastSubmissionAt, { addSuffix: true })
              : dashboardConfig.hero.historyFallback}
          </p>
          <p className="text-sm text-muted-foreground">{dashboardConfig.hero.summaryHelper}</p>
          <dl className="mt-6 space-y-4 text-xs text-muted-foreground">
            <div className="flex items-center justify-between">
              <dt>{dashboardConfig.hero.attemptsLabel}</dt>
              <dd className="text-foreground">{submissionSummary.totalAttempts}</dd>
            </div>
            <div className="h-2 border border-border bg-muted">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${Math.min(acceptanceRate, 100)}%` }}
              />
            </div>
            <div className="flex items-center justify-between">
              <dt>{dashboardConfig.hero.acceptanceLabel}</dt>
              <dd className="text-foreground">{acceptanceRate}%</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeader
          marker={dashboardConfig.metrics.section.marker}
          title={dashboardConfig.metrics.section.title}
          description={dashboardConfig.metrics.section.description}
        />
        <div className="grid gap-px bg-border/60 md:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <MetricCard key={metric.label} {...metric} />
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <SectionHeader
          marker={dashboardConfig.sections.telemetry.marker}
          title={dashboardConfig.sections.telemetry.title}
          description={dashboardConfig.sections.telemetry.description}
        />
        <div className="grid gap-6 xl:grid-cols-[1.3fr,0.7fr]">
          <div className="border-2 border-border bg-card">
            <div className="flex flex-col gap-2 border-b-2 border-border px-6 py-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-bold uppercase text-primary/80">
                  {dashboardConfig.sections.telemetry.chart.title}
                </p>
                <Badge variant="outline" className="text-xs">
                  {submissionOutcomeSeries.length} DAYS
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {dashboardConfig.sections.telemetry.chart.description}
              </p>
            </div>
            <div className="px-2 py-6 sm:px-6">
              {submissionOutcomeSeries.length > 0 ? (
                <SubmissionOutcomeChart
                  data={submissionOutcomeSeries}
                  acceptedLabel={dashboardConfig.sections.telemetry.chart.acceptedLabel}
                  failedLabel={dashboardConfig.sections.telemetry.chart.failedLabel}
                />
              ) : (
                <EmptyState
                  title={dashboardConfig.sections.telemetry.chart.empty.title}
                  description={dashboardConfig.sections.telemetry.chart.empty.description}
                  actionHref={dashboardConfig.hero.ctas.primary.href}
                  actionLabel={dashboardConfig.hero.ctas.primary.label}
                />
              )}
            </div>
          </div>
          <div className="border-2 border-border bg-card p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold uppercase text-primary/80">
                  {dashboardConfig.sections.backlog.title}
                </p>
                <p className="text-sm text-muted-foreground">
                  {dashboardConfig.sections.backlog.description}
                </p>
              </div>
            </div>
            <div className="mt-6 space-y-4">
              {practiceDeck.length > 0 ? (
                practiceDeck.map((problem) => (
                  <article
                    key={problem.id}
                    className="border border-border bg-background px-4 py-4 transition-colors hover:border-primary"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <Link
                        href={`/problems/${problem.slug}`}
                        className="text-sm font-bold uppercase tracking-tight text-foreground hover:text-primary"
                      >
                        {problem.title}
                      </Link>
                      <Badge variant="outline" className="text-[10px] uppercase">
                        {problem.difficulty?.toLowerCase() ??
                          dashboardConfig.sections.backlog.unknownDifficulty}
                      </Badge>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {dashboardConfig.sections.backlog.acceptanceLabel}{" "}
                      {problem.acceptanceRate !== null
                        ? `${Math.round(problem.acceptanceRate * 100)}%`
                        : "—"}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {problem.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag.slug} variant="outline" className="text-[10px] uppercase">
                          {tag.name}
                        </Badge>
                      ))}
                    </div>
                  </article>
                ))
              ) : (
                <EmptyState {...dashboardConfig.emptyStates.backlog} />
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <SectionHeader
          marker={dashboardConfig.sections.activity.marker}
          title={dashboardConfig.sections.activity.title}
          description={dashboardConfig.sections.activity.description}
        />
        <div className="grid gap-6 xl:grid-cols-[1.4fr,0.6fr]">
          <div className="border-2 border-border bg-card">
            <div className="flex flex-col gap-2 border-b-2 border-border px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-bold uppercase text-primary/80">
                  {dashboardConfig.sections.activity.table.title}
                </p>
                <p className="text-sm text-muted-foreground">
                  {dashboardConfig.sections.activity.table.description}
                </p>
              </div>
              <Button asChild variant="ghost" className="h-10">
                <Link href={dashboardConfig.sections.activity.table.actionHref} className="gap-2">
                  {dashboardConfig.sections.activity.table.actionLabel}
                  <ArrowRight05Icon className="h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="px-6 py-6">
              {submissionRows.length > 0 ? (
                <RecentSubmissionsTable data={submissionRows} />
              ) : (
                <EmptyState {...dashboardConfig.emptyStates.submissions} />
              )}
            </div>
          </div>
          <div className="border-2 border-border bg-card p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold uppercase text-primary/80">
                  {dashboardConfig.sections.activity.proposals.title}
                </p>
                <p className="text-sm text-muted-foreground">
                  {dashboardConfig.sections.activity.proposals.description}
                </p>
              </div>
              <Badge variant="outline" className="text-xs tracking-[0.2em]">
                {proposals.length} {dashboardConfig.sections.activity.proposals.statusLabel}
              </Badge>
            </div>
            <div className="mt-6 grid gap-px bg-border sm:grid-cols-3">
              {dashboardConfig.sections.activity.proposals.stats.map((stat) => (
                <div key={stat.key} className="bg-background px-4 py-5 text-center">
                  <p className="text-2xl font-black">{proposalStats[stat.key]}</p>
                  <p className="text-[11px] uppercase text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 space-y-4">
              {proposals.slice(0, 4).map((proposal) => (
                <article
                  key={proposal.id}
                  className="border border-border bg-background px-4 py-3 transition-colors hover:border-primary"
                >
                  <div className="flex items-center justify-between gap-2">
                    <Link
                      href="/proposals"
                      className="text-sm font-bold uppercase tracking-tight text-foreground hover:text-primary"
                    >
                      {proposal.title}
                    </Link>
                    <Badge variant="outline" className={statusBadgeClass(proposal.status)}>
                      {proposal.status.replace("_", " ").toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {dashboardConfig.sections.activity.proposals.intendedDifficultyLabel}:{" "}
                    {proposal.intendedDifficulty}
                  </p>
                </article>
              ))}
              {proposals.length === 0 ? (
                <EmptyState {...dashboardConfig.emptyStates.proposals} />
              ) : null}
            </div>
            <Button asChild variant="outline" className="mt-6 w-full">
              <Link href="/proposals/new">
                {dashboardConfig.sections.activity.proposals.ctaLabel}
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <SectionHeader
          marker={dashboardConfig.sections.contests.marker}
          title={dashboardConfig.sections.contests.title}
          description={dashboardConfig.sections.contests.description}
        />
        <div className="border-2 border-border bg-card p-6">
          <div className="flex flex-wrap items-center gap-3 border-b-2 border-border pb-4">
            <Calendar02Icon className="h-5 w-5 text-primary" />
            <p className="text-xs font-bold uppercase text-muted-foreground">
              {dashboardConfig.sections.contests.featuredLabel}
            </p>
            <Badge variant="outline" className="text-xs uppercase">
              {contestOverview.live.length} LIVE · {contestOverview.upcoming.length} UPCOMING
            </Badge>
          </div>
          <div className="mt-6 space-y-6">
            {nextContest ? (
              <FeaturedContestCard contest={nextContest} />
            ) : (
              <EmptyState {...dashboardConfig.emptyStates.contests} />
            )}
            <div>
              <div className="flex items-center justify-between text-xs uppercase text-muted-foreground">
                <p>{dashboardConfig.sections.contests.upcomingLabel}</p>
                <span>{contestOverview.upcoming.length} events</span>
              </div>
              {contestOverview.upcoming.length > 0 ? (
                <div className="mt-3 grid gap-px bg-border sm:grid-cols-2">
                  {contestOverview.upcoming.slice(0, 4).map((contest) => (
                    <article key={contest.id} className="bg-background px-4 py-4">
                      <p className="text-sm font-bold uppercase tracking-tight">{contest.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(contest.startsAt), { addSuffix: true })}
                      </p>
                      <div className="mt-3 flex items-center justify-between text-[11px] uppercase text-muted-foreground">
                        <span>
                          {contest.problemCount}{" "}
                          {dashboardConfig.sections.contests.stats.problems.toLowerCase()}
                        </span>
                        <span>
                          {contest.registrationCount}{" "}
                          {dashboardConfig.sections.contests.upcomingMeta.teams}
                        </span>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="mt-4">
                  <EmptyState {...dashboardConfig.emptyStates.contests} />
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function buildSubmissionOutcomeSeries(
  items: SubmissionSnapshot["items"],
): SubmissionOutcomeDatum[] {
  const uniqueRuns = new Map<string, SubmissionEntry>();
  for (const entry of items) {
    const key = `${entry.problemId}:${entry.codeHash ?? entry.id}`;
    if (!uniqueRuns.has(key)) {
      uniqueRuns.set(key, entry);
    }
  }
  const buckets = new Map<
    number,
    {
      date: Date;
      accepted: number;
      failed: number;
    }
  >();

  for (const entry of uniqueRuns.values()) {
    const created = new Date(entry.createdAt);
    const bucketKey = new Date(
      created.getFullYear(),
      created.getMonth(),
      created.getDate(),
    ).getTime();
    const bucket = buckets.get(bucketKey) ?? {
      date: new Date(created.getFullYear(), created.getMonth(), created.getDate()),
      accepted: 0,
      failed: 0,
    };
    if (!buckets.has(bucketKey)) {
      buckets.set(bucketKey, bucket);
    }
    if (entry.verdictCode && ACCEPTED_CODES.has(entry.verdictCode)) {
      bucket.accepted += 1;
    } else {
      bucket.failed += 1;
    }
  }

  return Array.from(buckets.values())
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(-10)
    .map(
      (bucket): SubmissionOutcomeDatum => ({
        dateLabel: format(bucket.date, "MMM d"),
        accepted: bucket.accepted,
        failed: bucket.failed,
      }),
    );
}

function ensureSubmissionSummary(snapshot: SubmissionSnapshot) {
  if (snapshot.summary) {
    return snapshot.summary;
  }

  const accepted = snapshot.items.filter((item) => ACCEPTED_CODES.has(item.verdictCode ?? ""));
  const fastestRuntimeMs = accepted.reduce<number | null>((acc, item) => {
    if (item.runtimeMs == null) return acc;
    if (acc == null) return item.runtimeMs;
    return Math.min(acc, item.runtimeMs);
  }, null);
  const bestMemoryKb = accepted.reduce<number | null>((acc, item) => {
    if (item.memoryKb == null) return acc;
    if (acc == null) return item.memoryKb;
    return Math.min(acc, item.memoryKb);
  }, null);

  return {
    totalAttempts: snapshot.items.length,
    acceptedAttempts: accepted.length,
    solvedProblems: accepted.filter((item) => item.firstAccepted).length,
    manualPending: 0,
    lastSubmissionAt: snapshot.items[0]?.createdAt ?? null,
    fastestRuntimeMs,
    bestMemoryKb,
  };
}

function summarizeProposals(proposals: ProposalEntry[]): ProposalStats {
  const statusOrder: ProblemProposalStatus[] = [
    ProblemProposalStatus.SUBMITTED,
    ProblemProposalStatus.PRESCREEN,
    ProblemProposalStatus.IN_REVIEW,
    ProblemProposalStatus.ACCEPTED,
    ProblemProposalStatus.CHANGES_REQUESTED,
    ProblemProposalStatus.REJECTED,
  ];

  const counts = Object.fromEntries(statusOrder.map((status) => [status, 0])) as Record<
    ProblemProposalStatus,
    number
  >;

  for (const proposal of proposals) {
    counts[proposal.status] = (counts[proposal.status] ?? 0) + 1;
  }

  return {
    submitted: counts.SUBMITTED,
    review: counts.IN_REVIEW + counts.PRESCREEN,
    accepted: counts.ACCEPTED,
  };
}

function statusBadgeClass(status: ProblemProposalStatus) {
  switch (status) {
    case ProblemProposalStatus.SUBMITTED:
      return "border-info/30 bg-info/10 text-info";
    case ProblemProposalStatus.PRESCREEN:
    case ProblemProposalStatus.IN_REVIEW:
      return "border-warning/30 bg-warning/10 text-warning";
    case ProblemProposalStatus.CHANGES_REQUESTED:
      return "border-primary/30 bg-primary/10 text-primary";
    case ProblemProposalStatus.ACCEPTED:
      return "border-success/30 bg-success/10 text-success";
    case ProblemProposalStatus.REJECTED:
      return "border-destructive/30 bg-destructive/10 text-destructive";
  }
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
    <div className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-[0.4em] text-primary/80">{marker}</p>
      <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <h2 className="bg-gradient-to-br from-foreground via-foreground to-foreground/70 bg-clip-text text-3xl font-black tracking-tight text-transparent">
          {title}
        </h2>
        {description ? (
          <p className="text-sm text-muted-foreground lg:max-w-xl">{description}</p>
        ) : null}
      </div>
    </div>
  );
}

type IconComponent = ComponentType<ComponentProps<"svg">>;

function QuickActionLink({
  icon: Icon,
  label,
  description,
  href,
}: {
  icon: IconComponent;
  label: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-2 border border-border bg-background px-4 py-5 transition-colors hover:border-primary hover:bg-accent/30"
    >
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <ArrowRight05Icon className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
      </div>
      <div className="flex items-center gap-3 text-foreground">
        <Icon className="h-5 w-5 text-primary" />
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </Link>
  );
}

function MetricCard({
  label,
  value,
  meta,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  meta: string;
  icon: IconComponent;
  accent?: string;
}) {
  return (
    <div className="flex flex-col gap-3 bg-card px-6 py-6">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase text-muted-foreground">{label}</p>
        <div className="border border-border bg-background p-2">
          <Icon className={cn("h-5 w-5", accent)} />
        </div>
      </div>
      <p className="text-3xl font-black tracking-tight">{value}</p>
      <p className="text-xs text-muted-foreground">{meta}</p>
    </div>
  );
}

function HighlightTile({ label, value, meta }: { label: string; value: string; meta: string }) {
  return (
    <div className="bg-background px-4 py-5">
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-black tracking-tight">{value}</p>
      <p className="text-xs text-muted-foreground">{meta}</p>
    </div>
  );
}

function FeaturedContestCard({ contest }: { contest: ContestPreview }) {
  const startsAt = new Date(contest.startsAt);

  return (
    <article className="border border-border bg-background">
      <div className="grid gap-4 border-b border-border px-5 py-4 md:grid-cols-[1.6fr_0.4fr]">
        <div>
          <p className="text-xs uppercase text-muted-foreground">
            {dashboardConfig.sections.contests.featuredLabel}
          </p>
          <h3 className="mt-1 text-2xl font-black tracking-tight">{contest.name}</h3>
          <p className="text-sm text-muted-foreground">{contest.description}</p>
        </div>
        <div className="flex flex-wrap gap-2 text-[11px] uppercase text-muted-foreground">
          <Badge variant="outline">
            {dashboardConfig.sections.contests.badges.type}: {contest.type}
          </Badge>
          <Badge variant="outline">
            {dashboardConfig.sections.contests.badges.state}: {contest.state}
          </Badge>
          {contest.isRated ? (
            <Badge variant="outline">{dashboardConfig.sections.contests.badges.rated}</Badge>
          ) : null}
        </div>
      </div>
      <div className="grid gap-px bg-border sm:grid-cols-3">
        <ContestFact
          label={dashboardConfig.sections.contests.stats.starts}
          value={format(startsAt, "MMM d · HH:mm")}
          meta={formatDistanceToNow(startsAt, { addSuffix: true })}
        />
        <ContestFact
          label={dashboardConfig.sections.contests.stats.problems}
          value={String(contest.problemCount)}
        />
        <ContestFact
          label={dashboardConfig.sections.contests.stats.registrations}
          value={String(contest.registrationCount)}
          meta={
            contest.viewerRegistration
              ? dashboardConfig.sections.contests.registrationMeta.registered
              : dashboardConfig.sections.contests.registrationMeta.notRegistered
          }
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-4">
        <div className="text-xs uppercase text-muted-foreground">
          {contest.viewerRegistration
            ? dashboardConfig.sections.contests.registrationMeta.registered
            : dashboardConfig.sections.contests.registrationMeta.notRegistered}
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild size="sm">
            <Link href={`/contests/${contest.slug}`}>
              {dashboardConfig.sections.contests.ctas.open}
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/contests">{dashboardConfig.sections.contests.ctas.hub}</Link>
          </Button>
        </div>
      </div>
    </article>
  );
}

function ContestFact({ label, value, meta }: { label: string; value: string; meta?: string }) {
  return (
    <div className="bg-background px-4 py-4">
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <p className="text-2xl font-black tracking-tight">{value}</p>
      {meta ? <p className="text-xs text-muted-foreground">{meta}</p> : null}
    </div>
  );
}

function EmptyState({
  title,
  description,
  actionHref,
  actionLabel,
}: {
  title: string;
  description: string;
  actionHref: string;
  actionLabel: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 border-2 border-dashed border-border bg-background px-6 py-10 text-center">
      <Award02Icon className="h-8 w-8 text-muted-foreground" />
      <p className="text-sm font-bold uppercase tracking-tight text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
      <Button asChild variant="outline" className="mt-2 px-6">
        <Link href={actionHref}>{actionLabel}</Link>
      </Button>
    </div>
  );
}
