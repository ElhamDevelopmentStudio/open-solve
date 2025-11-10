"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { formatDistanceToNow } from "date-fns";
import { trpc } from "@/lib/trpc/client";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Label,
  ScrollArea,
  Skeleton,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
} from "@/components/ui";
import { cn } from "@/lib/utils";
import { Loader2, Sparkles, Trophy } from "lucide-react";
import type { ContestDetailPayload, ContestStandingProblemCell } from "@/lib/contests/types";

export function ContestDashboard({ initialSlug }: { initialSlug?: string }) {
  const utils = trpc.useUtils();
  const overview = trpc.contests.overview.useQuery();
  const session = trpc.auth.getSession.useQuery(undefined, { staleTime: 60_000 });
  const [activeSlug, setActiveSlug] = useState<string | undefined>(initialSlug);

  const fallbackSlug = useMemo(() => {
    if (initialSlug) {
      return initialSlug;
    }
    const data = overview.data;
    if (!data) {
      return undefined;
    }
    return (
      data.featured?.slug ??
      data.live[0]?.slug ??
      data.upcoming[0]?.slug ??
      data.past[0]?.slug
    );
  }, [initialSlug, overview.data]);

  const slugToUse = activeSlug ?? fallbackSlug;

  const detail = trpc.contests.detail.useQuery(
    { slug: slugToUse ?? "" },
    { enabled: Boolean(slugToUse) },
  );

  const scoreboardRefreshMs =
    detail.data?.contest.state === "RUNNING"
      ? (detail.data.contest.settings.scoreboard.refreshIntervalSec ?? 15) * 1000
      : false;

  const standings = trpc.contests.standings.useInfiniteQuery(
    { slug: slugToUse ?? "", limit: 25 },
    {
      enabled: Boolean(slugToUse),
      getNextPageParam: (page) => page.cursor,
      refetchInterval: scoreboardRefreshMs || false,
    },
  );
  const [clarificationQuestion, setClarificationQuestion] = useState("");
  const [clarificationProblemId, setClarificationProblemId] = useState<string | undefined>();

  const clarifications = trpc.contests.clarifications.useQuery(
    { contestId: detail.data?.contest.id ?? "" },
    { enabled: Boolean(detail.data?.contest.id) },
  );
  const clarificationMutation = trpc.contests.submitClarification.useMutation({
    onSuccess: () => {
      if (detail.data?.contest.id) {
        utils.contests.clarifications.invalidate({ contestId: detail.data.contest.id });
      }
      setClarificationQuestion("");
      setClarificationProblemId(undefined);
      toastSuccess("Clarification sent");
    },
    onError: (error) => toastError(error.message),
  });

  const registerMutation = trpc.contests.register.useMutation({
    onSuccess: () => {
      utils.contests.detail.invalidate({ slug: activeSlug ?? "" });
      utils.contests.overview.invalidate();
      toastSuccess("Registered for contest");
    },
    onError: (error) => toastError(error.message),
  });
  const unregisterMutation = trpc.contests.unregister.useMutation({
    onSuccess: () => {
      utils.contests.detail.invalidate({ slug: activeSlug ?? "" });
      utils.contests.overview.invalidate();
      toastSuccess("Removed from roster");
    },
    onError: (error) => toastError(error.message),
  });

  const groups = useMemo(() => {
    if (!overview.data) return [];
    return [
      { title: "Live now", items: overview.data.live },
      { title: "Upcoming", items: overview.data.upcoming },
      { title: "Recently finished", items: overview.data.past.slice(0, 3) },
    ];
  }, [overview.data]);

  const isAdmin = session.data?.user.role === "ADMIN";

  const activeContest = detail.data?.contest;
  const viewerRegistration = detail.data?.viewerRegistration;
  const scoreboardRows = standings.data?.pages.flatMap((page) => page.rows) ?? [];
  const scoreboardMeta = standings.data?.pages[0]?.meta;
  const scoreboardProblems = detail.data?.problems ?? [];
  const clarificationsList = clarifications.data ?? [];
  const canSubmitClarification =
    Boolean(activeContest) &&
    Boolean(viewerRegistration) &&
    !!activeContest &&
    (activeContest.state === "UPCOMING" || activeContest.state === "RUNNING");

  const handleRegister = () => {
    if (!activeContest) return;
    registerMutation.mutate({ contestId: activeContest.id });
  };

  const handleUnregister = () => {
    if (!activeContest) return;
    unregisterMutation.mutate({ contestId: activeContest.id });
  };

  const handleClarificationSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeContest) return;
    clarificationMutation.mutate({
      contestId: activeContest.id,
      problemId: clarificationProblemId,
      question: clarificationQuestion,
    });
  };

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase text-muted-foreground">Competitive hub</p>
            <h1 className="text-2xl font-semibold tracking-tight">Contests</h1>
          </div>
          {isAdmin ? (
            <Button asChild variant="outline">
              <Link href="/staff/contests/new" className="inline-flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Launch contest
              </Link>
            </Button>
          ) : null}
        </div>
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background">
          <CardHeader className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg">{activeContest?.name ?? "Select a contest"}</CardTitle>
              <CardDescription>{activeContest?.description ?? "Pick a contest on the right to explore details."}</CardDescription>
            </div>
            {activeContest ? (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Badge variant="outline">{activeContest.type.toLowerCase()}</Badge>
                {activeContest.isRated ? (
                  <Badge variant="default" className="bg-primary/20 text-primary">
                    Rated
                  </Badge>
                ) : null}
                <Badge variant="secondary">{activeContest.visibility.toLowerCase()}</Badge>
                <Badge>{activeContest.rules}</Badge>
              </div>
            ) : null}
          </CardHeader>
          {activeContest ? (
            <CardContent className="grid gap-6 md:grid-cols-3">
              <div className="space-y-3">
                <p className="text-xs uppercase text-muted-foreground">Window</p>
                <p className="text-sm">Starts {formatRelative(activeContest.startsAt)}</p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Trophy className="h-4 w-4" />
                  {detail.data?.registration.total ?? 0} registrants
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-xs uppercase text-muted-foreground">Status</p>
                <StateBadge state={activeContest.state} />
                {viewerRegistration ? (
                  <p className="text-xs text-muted-foreground">
                    Joined {formatDistanceToNow(new Date(viewerRegistration.joinedAt), { addSuffix: true })}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">Not registered yet</p>
                )}
              </div>
              <div className="flex items-center justify-end gap-3">
                {viewerRegistration ? (
                  <Button variant="outline" size="sm" onClick={handleUnregister} disabled={unregisterMutation.isPending}>
                    Leave roster
                  </Button>
                ) : (
                  <Button size="sm" onClick={handleRegister} disabled={registerMutation.isPending}>
                    Register now
                  </Button>
                )}
              </div>
            </CardContent>
          ) : (
            <CardContent>
              <Skeleton className="h-24 w-full rounded-xl" />
            </CardContent>
          )}
        </Card>
      </section>
      <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div>
          <Tabs value={slugToUse ?? ""} onValueChange={setActiveSlug} className="space-y-6">
            <TabsList className="inline-flex w-full gap-2 overflow-x-auto">
              {groups.flatMap((group) => group.items).map((contest) => (
                <TabsTrigger key={contest.slug} value={contest.slug} className="min-w-[120px]">
                  {contest.name}
                </TabsTrigger>
              ))}
            </TabsList>
            <TabsContent value={activeSlug ?? ""}>
              {detail.isLoading || !activeContest ? (
                <Skeleton className="h-[320px] w-full rounded-xl" />
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Overview</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <Timeline timeline={detail.data?.timeline ?? []} />
                    <SettingsGrid detail={detail.data} />
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
          <Tabs defaultValue="standings" className="mt-6 space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="standings">Standings</TabsTrigger>
              <TabsTrigger value="problems">Problems</TabsTrigger>
              <TabsTrigger value="insights">Insights</TabsTrigger>
              <TabsTrigger value="clarifications">Clarifications</TabsTrigger>
            </TabsList>
            <TabsContent value="standings">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Live standings</CardTitle>
                  <CardDescription>
                    Auto-refreshes while submissions land. Freeze policy: {detail.data?.freezeActive ? "active" : "off"}.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {standings.isLoading ? (
                    <Skeleton className="h-48 w-full rounded-xl" />
                  ) : scoreboardRows.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {scoreboardMeta?.visibility === "hidden"
                        ? "Scoreboard is hidden for this contest."
                        : "No submissions yet."}
                    </p>
                  ) : (
                    <ScrollArea className="max-h-[500px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Rank</TableHead>
                            <TableHead>Competitor</TableHead>
                            <TableHead>Solved</TableHead>
                            <TableHead>Score</TableHead>
                            {detail.data?.contest.settings.scoreboard.showPenaltyColumn ? <TableHead>Penalty</TableHead> : null}
                            {scoreboardProblems.map((problem) => (
                              <TableHead key={problem.id} className="text-center text-xs">
                                <div className="font-semibold">{problem.label}</div>
                                <div className="text-[10px] text-muted-foreground">{problem.points ?? "—"} pts</div>
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {scoreboardRows.map((row) => {
                            const entryMap = new Map(row.entries.map((entry) => [entry.problemId, entry]));
                            return (
                              <TableRow key={row.user.id}>
                                <TableCell className="font-semibold">{row.rank}</TableCell>
                                <TableCell>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <div className="h-8 w-8 rounded-full bg-muted" />
                                    <div>
                                      <p className="text-sm font-medium">{row.user.handle}</p>
                                      <p className="text-xs text-muted-foreground">{row.user.country ?? "Global"}</p>
                                    </div>
                                    {row.isVirtual ? <Badge variant="outline">Virtual</Badge> : null}
                                    {row.isDisqualified ? <Badge variant="destructive">DQ</Badge> : null}
                                  </div>
                                </TableCell>
                                <TableCell>{row.solved}</TableCell>
                                <TableCell>{row.score.toFixed(2)}</TableCell>
                                {detail.data?.contest.settings.scoreboard.showPenaltyColumn ? <TableCell>{row.penalty}</TableCell> : null}
                                {scoreboardProblems.map((problem) => (
                                  <TableCell key={`${row.user.id}-${problem.id}`} className="text-center">
                                    <ProblemStatusCell entry={entryMap.get(problem.id)} />
                                  </TableCell>
                                ))}
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  )}
                  {scoreboardMeta && scoreboardMeta.visibility !== "full" ? (
                    <p className="text-xs text-muted-foreground">
                      Visibility mode: {scoreboardMeta.visibility}. {scoreboardMeta.limited ? "Only partial data is visible right now." : ""}
                    </p>
                  ) : null}
                  {standings.hasNextPage && scoreboardRows.length > 0 ? (
                    <Button variant="secondary" size="sm" onClick={() => standings.fetchNextPage()} disabled={standings.isFetchingNextPage}>
                      {standings.isFetchingNextPage ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Load more
                    </Button>
                  ) : null}
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="problems">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Contest set</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  {detail.data?.problems.map((problem) => (
                    <div key={problem.id} className="rounded-lg border p-4">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline">{problem.label}</Badge>
                        <Badge variant="secondary">{problem.difficulty ?? "TBD"}</Badge>
                      </div>
                      <p className="mt-2 text-sm font-semibold">{problem.title}</p>
                      <p className="text-xs text-muted-foreground">{problem.slug}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="insights">
              <Card>
                <CardContent className="py-10 text-center text-sm text-muted-foreground">
                  Leaderboard insights, language stats, and freeze deltas will land here soon.
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="clarifications">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Clarifications</CardTitle>
                  <CardDescription>Questions stay private unless staff publish the answer.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {canSubmitClarification ? (
                    <form onSubmit={handleClarificationSubmit} className="space-y-3">
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="grid gap-1">
                          <Label className="text-xs uppercase">Problem</Label>
                          <Select
                            value={clarificationProblemId ?? "general"}
                            onValueChange={(value) => setClarificationProblemId(value === "general" ? undefined : value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="General" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="general">General question</SelectItem>
                              {detail.data?.problems.map((problem) => (
                                <SelectItem key={problem.id} value={problem.id}>
                                  {problem.label} · {problem.title}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-1">
                          <Label className="text-xs uppercase">Question</Label>
                          <Textarea
                            rows={3}
                            value={clarificationQuestion}
                            onChange={(event) => setClarificationQuestion(event.target.value)}
                            placeholder="Keep it concise and avoid spoilers."
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          type="submit"
                          size="sm"
                          disabled={clarificationMutation.isPending || clarificationQuestion.trim().length < 8}
                        >
                          {clarificationMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                          Send question
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Register for this contest to send clarification requests.
                    </p>
                  )}
                  <div className="space-y-3">
                    {clarifications.isLoading ? (
                      <Skeleton className="h-32 w-full rounded-xl" />
                    ) : clarificationsList.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No clarifications yet.</p>
                    ) : (
                      clarificationsList.map((item) => (
                        <div key={item.id} className="rounded-lg border bg-card/50 p-3">
                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="outline">{item.problem?.label ?? "General"}</Badge>
                              {item.visibility === "PUBLIC" ? <Badge variant="secondary">Broadcast</Badge> : null}
                              {item.isMine ? <Badge variant="default">My request</Badge> : null}
                            </div>
                            <div className="flex items-center gap-2">
                              <span>{formatRelative(item.createdAt)}</span>
                              <Badge
                                variant={
                                  item.status === "ANNOUNCED" || item.status === "ANSWERED" ? "outline" : "secondary"
                                }
                              >
                                {item.status.toLowerCase()}
                              </Badge>
                            </div>
                          </div>
                          <p className="mt-2 text-sm font-medium">{item.question}</p>
                          {item.answer ? (
                            <div className="mt-3 rounded-md border border-primary/20 bg-primary/5 p-3 text-sm">
                              <p className="text-xs uppercase text-muted-foreground">Answer</p>
                              <p>{item.answer}</p>
                              {item.answeredBy ? (
                                <p className="mt-1 text-xs text-muted-foreground">
                                  by {item.answeredBy.handle ?? item.answeredBy.name ?? "Staff"} ·{" "}
                                  {item.answeredAt ? formatRelative(item.answeredAt) : ""}
                                </p>
                              ) : null}
                            </div>
                          ) : (
                            <p className="mt-2 text-xs text-muted-foreground">Awaiting response</p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
        <aside className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contest roster</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {groups.map((group) => (
                <div key={group.title} className="rounded-lg border px-3 py-2">
                  <p className="text-xs uppercase text-muted-foreground">{group.title}</p>
                  {group.items.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nothing yet.</p>
                  ) : (
                    <ul className="space-y-1 text-sm">
                      {group.items.map((contest) => (
                        <li key={contest.id}>
                          <button
                            type="button"
                            onClick={() => setActiveSlug(contest.slug)}
                            className={cn(
                              "flex w-full items-center justify-between rounded-md px-2 py-1 text-left",
                              contest.slug === activeSlug ? "bg-primary/10" : "hover:bg-muted",
                            )}
                          >
                            <span>{contest.name}</span>
                            <Badge variant="outline">{formatRelative(contest.startsAt)}</Badge>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </aside>
      </section>
    </div>
  );
}

function SettingsGrid({ detail }: { detail?: ContestDetailPayload | null }) {
  if (!detail) return null;
  const settings = detail.contest.settings;
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <div className="rounded-lg border p-4">
        <p className="text-xs uppercase text-muted-foreground">Scoring</p>
        <p className="text-sm font-semibold">{settings.scoring.mode}</p>
        <p className="text-xs text-muted-foreground">Tie-breakers: {settings.scoring.tieBreakers.join(", ")}</p>
      </div>
      <div className="rounded-lg border p-4">
        <p className="text-xs uppercase text-muted-foreground">Freeze</p>
        <p className="text-sm font-semibold">{settings.freeze.enabled ? `${settings.freeze.offsetMinutes}m before end` : "Disabled"}</p>
        <p className="text-xs text-muted-foreground">Mode: {settings.freeze.mode}</p>
      </div>
      <div className="rounded-lg border p-4">
        <p className="text-xs uppercase text-muted-foreground">Anti-cheat</p>
        <p className="text-sm font-semibold">Discussion + profile lock {settings.antiCheat.lockDiscussions ? "on" : "off"}</p>
        <p className="text-xs text-muted-foreground">Throttle {settings.antiCheat.throttlePerMinute}/min</p>
      </div>
    </div>
  );
}

function Timeline({ timeline }: { timeline: ContestDetailPayload["timeline"] }) {
  return (
    <ol className="space-y-4">
      {timeline.map((item) => (
        <li key={item.label} className="flex items-start gap-3">
          <div className={cn("mt-1 h-3 w-3 rounded-full", item.state === "complete" ? "bg-primary" : "bg-muted")}></div>
          <div>
            <p className="text-sm font-semibold">{item.label}</p>
            <p className="text-xs text-muted-foreground">{formatRelative(item.at)}</p>
            {item.description ? <p className="text-xs">{item.description}</p> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

function ProblemStatusCell({ entry }: { entry?: ContestStandingProblemCell }) {
  if (!entry) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  const tone =
    entry.status === "AC"
      ? "bg-emerald-100 text-emerald-900"
      : entry.status === "FAILED"
        ? "bg-rose-100 text-rose-900"
        : entry.status === "PENDING"
          ? "bg-amber-100 text-amber-900"
          : "bg-muted text-muted-foreground";
  return (
    <div className="flex flex-col items-center gap-1 text-[11px]">
      <span className={cn("rounded-full px-2 py-0.5 font-semibold", tone)}>
        {entry.status === "AC"
          ? entry.timeMinutes !== null
            ? `${entry.timeMinutes}m`
            : "AC"
          : entry.status === "FAILED"
            ? `-${entry.attempts}`
            : entry.status === "PENDING"
              ? "…"
              : entry.status === "LOCKED"
                ? "—"
                : entry.status}
      </span>
      <span className="text-[10px] text-muted-foreground">
        {entry.attempts} tries
        {entry.isFrozen ? " • Frozen" : ""}
      </span>
    </div>
  );
}

function StateBadge({ state }: { state: string }) {
  const map: Record<string, { label: string; tone: string }> = {
    UPCOMING: { label: "Upcoming", tone: "bg-amber-100 text-amber-900" },
    RUNNING: { label: "Live", tone: "bg-emerald-100 text-emerald-900" },
    FINISHED: { label: "Finished", tone: "bg-muted text-muted-foreground" },
    ARCHIVED: { label: "Archived", tone: "bg-muted text-muted-foreground" },
  };
  const meta = map[state] ?? map.UPCOMING;
  return <Badge className={cn("border", meta.tone)}>{meta.label}</Badge>;
}

const formatRelative = (date?: Date | string | null) => {
  if (!date) return "TBD";
  return formatDistanceToNow(new Date(date), { addSuffix: true });
};

const toastSuccess = (message: string) => {
  if (typeof window !== "undefined") {
    import("sonner").then(({ toast }) => toast.success(message));
  }
};

const toastError = (message: string) => {
  if (typeof window !== "undefined") {
    import("sonner").then(({ toast }) => toast.error(message));
  }
};
