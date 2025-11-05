"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";
import { AlertCircle, ArrowLeft, Clock, ExternalLink, Flame, Shield, Trophy, Users } from "@/components/icons";
import Link from "next/link";
import { toast } from "sonner";

type ContestDetailProps = {
  slug: string;
};

export const ContestDetail = ({ slug }: ContestDetailProps) => {
  const utils = trpc.useUtils();
  const detail = trpc.contests.detail.useQuery({ slug });
  const session = trpc.auth.getSession.useQuery();

  const registerMutation = trpc.contests.register.useMutation({
    onSuccess: () => {
      utils.contests.detail.invalidate({ slug });
      utils.contests.overview.invalidate();
      toast.success("Registered successfully", {
        description: "You're now registered for this contest",
      });
    },
    onError: (error) => {
      toast.error("Registration failed", {
        description: error.message,
      });
    },
  });

  const unregisterMutation = trpc.contests.unregister.useMutation({
    onSuccess: () => {
      utils.contests.detail.invalidate({ slug });
      utils.contests.overview.invalidate();
      toast.success("Unregistered", {
        description: "You've been removed from the contest roster",
      });
    },
    onError: (error) => {
      toast.error("Failed to unregister", {
        description: error.message,
      });
    },
  });

  if (detail.isLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-8 animate-fade-in">
        <Skeleton className="h-10 w-64 rounded-xl" />
        <div className="premium-card space-y-6 rounded-2xl p-8">
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!detail.data) {
    return (
      <div className="mx-auto max-w-6xl animate-fade-in">
        <div className="premium-card rounded-2xl border-destructive/20 p-8 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
          <h2 className="mt-4 text-xl font-semibold">Contest Not Found</h2>
          <p className="mt-2 text-sm text-muted-foreground">The contest you&apos;re looking for doesn&apos;t exist.</p>
          <Button asChild className="mt-6 rounded-xl" variant="outline">
            <Link href="/contests">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Contests
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const contest = detail.data.contest;
  const viewerRegistration = detail.data.viewerRegistration;
  const isRegistered = Boolean(viewerRegistration);

  return (
    <div className="mx-auto max-w-6xl space-y-8 animate-fade-in">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm" className="rounded-xl">
          <Link href="/contests">
            <ArrowLeft className="mr-2 h-4 w-4" />
            All Contests
          </Link>
        </Button>
      </div>

      <div className="premium-card space-y-6 rounded-2xl p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex-1 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <ContestStateBadge state={contest.state} />
              {contest.isRated ? (
                <Badge className="rounded-full border border-primary/30 bg-primary/10 text-primary">
                  Rated
                </Badge>
              ) : null}
              <Badge variant="outline" className="rounded-full text-[10px] uppercase">
                {contest.visibility.toLowerCase()}
              </Badge>
            </div>

            <div>
              <h1 className="text-3xl font-bold tracking-tight">{contest.name}</h1>
              {contest.description ? (
                <p className="mt-2 text-muted-foreground">{contest.description}</p>
              ) : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <StatPill
                icon={<Clock className="h-4 w-4" />}
                label="Starts"
                value={format(new Date(contest.startsAt), "MMM d, HH:mm")}
                helper={formatDistanceToNow(new Date(contest.startsAt), { addSuffix: true })}
              />
              <StatPill
                icon={<Users className="h-4 w-4" />}
                label="Participants"
                value={detail.data.registration.total.toLocaleString()}
                helper={`${detail.data.registration.virtual} virtual`}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-card/60 p-6 lg:w-80">
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold">
                  {isRegistered ? "You're Registered" : "Join This Contest"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isRegistered && viewerRegistration
                    ? `Joined ${formatDistanceToNow(new Date(viewerRegistration.joinedAt), { addSuffix: true })}`
                    : "Register to participate and compete"}
                </p>
              </div>

              {isRegistered ? (
                <Button
                  variant="outline"
                  onClick={() => unregisterMutation.mutate({ contestId: contest.id })}
                  disabled={unregisterMutation.isPending}
                  className="w-full rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10"
                >
                  Leave Contest
                </Button>
              ) : (
                <Button
                  onClick={() => registerMutation.mutate({ contestId: contest.id })}
                  disabled={registerMutation.isPending || !session.data}
                  className="w-full rounded-xl"
                >
                  Register Now
                </Button>
              )}

              <div className="space-y-2 rounded-xl border border-border/40 bg-muted/40 p-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Format</span>
                  <span className="font-medium">{contest.rules}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type</span>
                  <span className="font-medium">{contest.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Scoring</span>
                  <span className="font-medium">{contest.settings.scoring.mode}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 rounded-2xl bg-muted/60 p-1">
          <TabsTrigger value="overview" className="rounded-xl">
            Overview
          </TabsTrigger>
          <TabsTrigger value="problems" className="rounded-xl">
            Problems
          </TabsTrigger>
          <TabsTrigger value="timeline" className="rounded-xl">
            Timeline
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="premium-card space-y-4 rounded-2xl p-6">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Scoring Rules</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Mode</span>
                  <span className="font-medium">{contest.settings.scoring.mode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tie Breakers</span>
                  <span className="font-medium">{contest.settings.scoring.tieBreakers.join(", ")}</span>
                </div>
              </div>
            </div>

            <div className="premium-card space-y-4 rounded-2xl p-6">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-muted-foreground" />
                <h3 className="font-semibold">Contest Rules</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ruleset</span>
                  <span className="font-medium">{contest.rules}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type</span>
                  <span className="font-medium">{contest.type}</span>
                </div>
              </div>
            </div>

            <div className="premium-card space-y-4 rounded-2xl p-6">
              <div className="flex items-center gap-2">
                <Flame className="h-5 w-5 text-amber-500" />
                <h3 className="font-semibold">Freeze Settings</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span className="font-medium">
                    {contest.settings.freeze.enabled ? "Enabled" : "Disabled"}
                  </span>
                </div>
                {contest.settings.freeze.enabled ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Offset</span>
                      <span className="font-medium">{contest.settings.freeze.offsetMinutes}m before end</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Mode</span>
                      <span className="font-medium">{contest.settings.freeze.mode}</span>
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline" className="rounded-xl">
              <Link href={`/contests/${slug}/scoreboard`}>
                <Trophy className="mr-2 h-4 w-4" />
                View Scoreboard
              </Link>
            </Button>
            <Button asChild variant="outline" className="rounded-xl">
              <Link href={`/contests/${slug}/clarifications`}>
                <ExternalLink className="mr-2 h-4 w-4" />
                Clarifications
              </Link>
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="problems" className="space-y-4">
          {detail.data.problems.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {detail.data.problems.map((problem) => (
                <div key={problem.id} className="premium-card rounded-2xl p-6">
                  <div className="flex items-start justify-between">
                    <Badge variant="outline" className="rounded-full text-[10px] uppercase">
                      {problem.label}
                    </Badge>
                    {problem.difficulty ? (
                      <span className="text-xs text-muted-foreground">{problem.difficulty}</span>
                    ) : null}
                  </div>
                  <h3 className="mt-3 font-semibold">{problem.title}</h3>
                  <p className="text-xs text-muted-foreground">{problem.slug}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">
                      {problem.points ?? 100} points
                    </span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">
                      Order {problem.order + 1}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="premium-card rounded-2xl p-12 text-center">
              <AlertCircle className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">Problems will be revealed when the contest starts</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="timeline" className="space-y-4">
          <div className="premium-card space-y-4 rounded-2xl p-6">
            <h3 className="font-semibold">Contest Timeline</h3>
            <p className="text-sm text-muted-foreground">All times are in your local timezone</p>
            <ol className="space-y-4">
              {detail.data.timeline.map((item) => (
                <li key={item.label} className="flex items-start gap-4">
                  <div
                    className={cn(
                      "mt-1 h-3 w-3 shrink-0 rounded-full border-2",
                      item.state === "complete"
                        ? "border-primary bg-primary"
                        : item.state === "active"
                          ? "border-success bg-success"
                          : "border-muted bg-muted"
                    )}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{item.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(item.at), "MMM d, yyyy 'at' HH:mm")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(item.at), { addSuffix: true })}
                    </p>
                    {item.description ? (
                      <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

const StatPill = ({
  icon,
  label,
  value,
  helper,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  helper?: string;
}) => {
  return (
    <div className="rounded-xl border border-border/70 bg-card/70 p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="mt-1 text-base font-semibold">{value}</p>
      {helper ? <p className="text-xs text-muted-foreground">{helper}</p> : null}
    </div>
  );
};

const ContestStateBadge = ({ state }: { state: string }) => {
  const styles: Record<string, string> = {
    UPCOMING: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200",
    RUNNING: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200",
    FINISHED: "bg-muted text-muted-foreground",
    ARCHIVED: "bg-muted text-muted-foreground",
  };

  const labelMap: Record<string, string> = {
    UPCOMING: "Upcoming",
    RUNNING: "Live",
    FINISHED: "Finished",
    ARCHIVED: "Archived",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
        styles[state] ?? "bg-muted text-muted-foreground"
      )}
    >
      {labelMap[state] ?? state.toLowerCase()}
    </span>
  );
};

