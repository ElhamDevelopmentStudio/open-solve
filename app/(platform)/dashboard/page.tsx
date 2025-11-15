import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createTRPCCaller } from "@/lib/trpc/server/caller";
import { getSession } from "@/lib/auth/session";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/lib/trpc/router";
import {
  ArrowRight05Icon,
  Award02Icon,
  Calendar02Icon,
  CodeSquareIcon,
  Megaphone01Icon,
  SparklesIcon,
  Target01Icon,
} from "hugeicons-react";
import { RecentSubmissionsTable, type RecentSubmissionRow } from "@/components/dashboard/recent-submissions-table";
import { cn } from "@/lib/utils";
import { ProblemProposalStatus } from "@prisma/client";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type SubmissionSnapshot = RouterOutputs["submissions"]["listMine"];
type ProposalEntry = RouterOutputs["proposals"]["listMine"][number];

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
  const nextContest = contestOverview.featured ?? contestOverview.upcoming[0] ?? contestOverview.live[0] ?? null;
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

  const metrics = [
    {
      label: "Solved problems",
      value: submissionSummary.solvedProblems,
      meta: `${submissionSummary.acceptedAttempts} accepted`,
      icon: Target01Icon,
      accent: "text-emerald-600 dark:text-emerald-300",
    },
    {
      label: "Acceptance rate",
      value: `${acceptanceRate}%`,
      meta: `${submissionSummary.totalAttempts} attempts`,
      icon: SparklesIcon,
      accent: "text-blue-600 dark:text-blue-300",
    },
    {
      label: "Manual reviews",
      value: submissionSummary.manualPending,
      meta: submissionSummary.manualPending > 0 ? "Awaiting staff action" : "All clear",
      icon: Megaphone01Icon,
      accent: "text-amber-600 dark:text-amber-300",
    },
    {
      label: "Fastest runtime",
      value: submissionSummary.fastestRuntimeMs ? `${submissionSummary.fastestRuntimeMs} ms` : "—",
      meta: submissionSummary.bestMemoryKb ? `${submissionSummary.bestMemoryKb} kb memory` : "No benchmark",
      icon: ArrowRight05Icon,
      accent: "text-purple-600 dark:text-purple-300",
    },
  ];

  const quickActions = [
    {
      label: "Browse problems",
      href: "/problems",
      icon: CodeSquareIcon,
      description: "Filter by tags, difficulty, and editorial access.",
    },
    {
      label: "Review submissions",
      href: "/submissions",
      icon: SparklesIcon,
      description: "Inspect verdicts and rerun local tests.",
    },
    {
      label: "Track proposals",
      href: "/proposals",
      icon: Megaphone01Icon,
      description: "Draft new problems or follow up on feedback.",
    },
  ];

  return (
    <div className="space-y-8 pb-10">
      <section className="rounded-3xl border border-border/60 bg-gradient-to-br from-primary/5 via-background to-secondary/10 p-6 sm:p-8">
        <div className="grid gap-8 lg:grid-cols-[2fr,1fr]">
          <div className="space-y-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
                Mission Control
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                {session?.user.name ?? session?.user.handle ?? "Solver"}, get ready for the next solve.
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Monitor your submissions, upcoming contests, and proposals without leaving this cockpit.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {quickActions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="group rounded-2xl border border-border/70 bg-card/70 p-4 transition hover:border-primary/60"
                >
                  <action.icon className="h-5 w-5 text-primary" />
                  <p className="mt-3 text-sm font-semibold text-foreground">{action.label}</p>
                  <p className="text-xs text-muted-foreground">{action.description}</p>
                </Link>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-border/50 bg-background/70 p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Last submission
            </p>
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {submissionSummary.lastSubmissionAt
                ? formatDistanceToNow(submissionSummary.lastSubmissionAt, { addSuffix: true })
                : "No history yet"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Keep the streak alive by solving any problem today.
            </p>
            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Attempts</span>
                <span>{submissionSummary.totalAttempts}</span>
              </div>
              <div className="h-2 rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${Math.min(acceptanceRate, 100)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Acceptance</span>
                <span>{acceptanceRate}%</span>
              </div>
            </div>
            <Button asChild className="mt-6 w-full">
              <Link href="/problems">Solve a problem</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <Card key={metric.label} className="border-border/60">
            <CardContent className="flex items-start justify-between gap-4 p-5">
              <div>
                <p className="text-xs uppercase text-muted-foreground">{metric.label}</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">{metric.value}</p>
                <p className="text-xs text-muted-foreground">{metric.meta}</p>
              </div>
              <div className="rounded-2xl bg-muted/60 p-3">
                <metric.icon className={cn("h-5 w-5", metric.accent)} />
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[2fr,1fr]">
        <Card className="border-border/60">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Recent activity</CardTitle>
                <CardDescription>Latest submissions across contests and practice.</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/submissions" className="gap-2">
                  View all
                  <ArrowRight05Icon className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {submissionRows.length > 0 ? (
              <RecentSubmissionsTable data={submissionRows} />
            ) : (
              <EmptyState
                title="No submissions yet"
                description="Once you submit code, the latest runs will show up here."
                actionLabel="Browse problems"
                actionHref="/problems"
              />
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-base">Proposal pipeline</CardTitle>
            <CardDescription>Drafts and submissions you are currently tracking.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {proposalStats.map((status) => (
                <div
                  key={status.label}
                  className="rounded-2xl border border-border/50 bg-accent/20 p-3 text-center"
                >
                  <p className="text-lg font-semibold text-foreground">{status.value}</p>
                  <p className="text-[11px] uppercase text-muted-foreground">{status.label}</p>
                </div>
              ))}
            </div>
            <div className="space-y-3">
              {proposals.slice(0, 4).map((proposal) => (
                <div
                  key={proposal.id}
                  className="rounded-2xl border border-border/60 p-3 transition hover:border-primary/50"
                >
                  <div className="flex items-center justify-between gap-2">
                    <Link href="/proposals" className="text-sm font-medium text-foreground hover:text-primary">
                      {proposal.title}
                    </Link>
                    <Badge variant="outline" className={statusBadgeClass(proposal.status)}>
                      {proposal.status.replace("_", " ").toLowerCase()}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Intended difficulty: {proposal.intendedDifficulty}
                  </p>
                </div>
              ))}
              {proposals.length === 0 ? (
                <EmptyState
                  title="No proposals submitted"
                  description="Share a new problem idea with the community."
                  actionLabel="Start proposal"
                  actionHref="/proposals"
                  compact
                />
              ) : null}
            </div>
            <Button asChild className="w-full" variant="outline">
              <Link href="/proposals/new">Create proposal</Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.3fr,0.7fr]">
        <Card className="border-border/60">
          <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="text-base">Contest radar</CardTitle>
              <CardDescription>Preview windows, registrations, and rating impact.</CardDescription>
            </div>
            <Badge variant="outline" className="gap-2 text-xs">
              <Calendar02Icon className="h-4 w-4" />
              {contestOverview.live.length} live · {contestOverview.upcoming.length} upcoming
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            {nextContest ? (
              <div className="rounded-2xl border border-border/50 bg-accent/20 p-4">
                <p className="text-xs uppercase text-muted-foreground">Featured contest</p>
                <h3 className="mt-1 text-xl font-semibold text-foreground">{nextContest.name}</h3>
                <p className="text-sm text-muted-foreground">{nextContest.description}</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <ContestStat label="Starts" value={formatDate(nextContest.startsAt)} />
                  <ContestStat label="Problems" value={nextContest.problemCount} />
                  <ContestStat
                    label="Registrations"
                    value={nextContest.registrationCount}
                    muted={nextContest.viewerRegistration ? "Registered" : "Not registered"}
                  />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge variant="secondary" className="uppercase">
                    {nextContest.type.toLowerCase()}
                  </Badge>
                  <Badge variant="outline" className="uppercase">
                    {nextContest.state.toLowerCase()}
                  </Badge>
                  {nextContest.isRated ? (
                    <Badge variant="outline" className="uppercase">
                      rated
                    </Badge>
                  ) : null}
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Button asChild size="sm">
                    <Link href={`/contests/${nextContest.slug}`}>Open contest</Link>
                  </Button>
                  <Button variant="outline" asChild size="sm">
                    <Link href="/contests">Contest hub</Link>
                  </Button>
                </div>
              </div>
            ) : (
              <EmptyState
                title="No contests available"
                description="Keep an eye on this feed to catch upcoming windows."
                actionLabel="Explore contests"
                actionHref="/contests"
                compact
              />
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              {contestOverview.upcoming.slice(0, 4).map((contest) => (
                <div key={contest.id} className="rounded-2xl border border-border/50 p-3">
                  <p className="text-sm font-medium text-foreground">{contest.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(contest.startsAt), { addSuffix: true })}
                  </p>
                  <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{contest.problemCount} problems</span>
                    <span>{contest.registrationCount} teams</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="flex flex-col gap-2">
            <CardTitle className="text-base">Focus backlog</CardTitle>
            <CardDescription>Fresh problems to bookmark for this week’s drills.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {practiceDeck.length > 0 ? (
              practiceDeck.map((problem) => (
                <div
                  key={problem.id}
                  className="rounded-2xl border border-border/60 p-3 transition hover:border-primary/50"
                >
                  <div className="flex items-center justify-between">
                    <Link
                      href={`/problems/${problem.slug}`}
                      className="text-sm font-semibold text-foreground hover:text-primary"
                    >
                      {problem.title}
                    </Link>
                    <Badge variant="outline" className="text-[10px] uppercase">
                      {problem.difficulty?.toLowerCase() ?? "unknown"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Acceptance{" "}
                    {problem.acceptanceRate !== null
                      ? `${Math.round(problem.acceptanceRate * 100)}%`
                      : "—"}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {problem.tags.slice(0, 3).map((tag) => (
                      <Badge key={tag.slug} variant="secondary" className="text-[10px]">
                        {tag.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <EmptyState
                title="No public problems"
                description="Something went wrong fetching problem suggestions."
                actionLabel="Open problem list"
                actionHref="/problems"
                compact
              />
            )}
          </CardContent>
        </Card>
      </section>
    </div>
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

function summarizeProposals(proposals: ProposalEntry[]) {
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

  return [
    { label: "Submitted", value: counts.SUBMITTED },
    { label: "In review", value: counts.IN_REVIEW + counts.PRESCREEN },
    { label: "Accepted", value: counts.ACCEPTED },
  ];
}

function statusBadgeClass(status: ProblemProposalStatus) {
  switch (status) {
    case "SUBMITTED":
      return "bg-blue-500/10 text-blue-600 dark:text-blue-300";
    case "PRESCREEN":
    case "IN_REVIEW":
      return "bg-amber-500/10 text-amber-600 dark:text-amber-300";
    case "CHANGES_REQUESTED":
      return "bg-purple-500/10 text-purple-600 dark:text-purple-300";
    case "ACCEPTED":
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300";
    case "REJECTED":
      return "bg-rose-500/10 text-rose-600 dark:text-rose-300";
  }
}

function formatDate(date: Date | string) {
  const instance = typeof date === "string" ? new Date(date) : date;
  return instance.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function ContestStat({ label, value, muted }: { label: string; value: string | number; muted?: string }) {
  return (
    <div>
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold text-foreground">{value}</p>
      {muted ? <p className="text-xs text-muted-foreground">{muted}</p> : null}
    </div>
  );
}

function EmptyState({
  title,
  description,
  actionHref,
  actionLabel,
  compact = false,
}: {
  title: string;
  description: string;
  actionHref: string;
  actionLabel: string;
  compact?: boolean;
}) {
  return (
    <div className={cn("rounded-2xl border border-dashed border-border/70 p-6 text-center", compact && "py-8")}>
      <Award02Icon className="mx-auto h-10 w-10 text-muted-foreground/60" />
      <p className="mt-3 font-medium text-foreground">{title}</p>
      <p className="text-sm text-muted-foreground">{description}</p>
      <Button asChild size="sm" variant="outline" className="mt-4">
        <Link href={actionHref}>{actionLabel}</Link>
      </Button>
    </div>
  );
}
