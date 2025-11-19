"use client";

import Link from "next/link";
import { useMemo, useState, type ComponentType, type SVGProps } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { ClarificationStatus, ClarificationVisibility } from "@prisma/client";
import type { inferRouterOutputs } from "@trpc/server";
import {
  Alert01Icon,
  Calendar02Icon,
  FilterIcon,
  Flag01Icon,
  Message01Icon,
  SparklesIcon,
  Timer01Icon,
  UserGroupIcon,
} from "hugeicons-react";
import { toast } from "sonner";

import type { AppRouter } from "@/lib/trpc/router";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type DataTableColumn, DataTableColumnHeader } from "@/components/ui/data-table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type ContestRecord = RouterOutputs["staff"]["contests"]["list"][number];
type ClarificationRecord = RouterOutputs["staff"]["contests"]["clarifications"][number];

const contestStateClasses: Record<ContestRecord["state"], string> = {
  UPCOMING: "bg-amber-500/10 text-amber-600 dark:text-amber-300",
  RUNNING: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  FINISHED: "bg-blue-500/10 text-blue-600 dark:text-blue-300",
  ARCHIVED: "bg-slate-500/10 text-slate-600 dark:text-slate-300",
};

const clarificationStatusClasses: Record<ClarificationStatus, string> = {
  OPEN: "bg-amber-500/10 text-amber-600 dark:text-amber-300",
  ANSWERED: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  ANNOUNCED: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-300",
  CLOSED: "bg-slate-500/10 text-slate-600 dark:text-slate-300",
};

const visibilityClasses: Record<ClarificationVisibility, string> = {
  PRIVATE: "bg-slate-500/10 text-slate-600 dark:text-slate-300",
  PUBLIC: "bg-blue-500/10 text-blue-600 dark:text-blue-300",
};

export function StaffContestDashboard() {
  const utils = trpc.useUtils();
  const contestQuery = trpc.staff.contests.list.useQuery(undefined, {
    refetchInterval: 30000,
  });
  const [stateFilter, setStateFilter] = useState<ContestRecord["state"] | "ALL">("ALL");
  const [activeContestId, setActiveContestId] = useState<string>();
  const [respondingTo, setRespondingTo] = useState<ClarificationRecord | null>(null);
  const [responseText, setResponseText] = useState("");
  const [responseVisibility, setResponseVisibility] = useState<ClarificationVisibility>("PRIVATE");
  const [responseStatus, setResponseStatus] = useState<ClarificationStatus>("ANSWERED");

  const contests = useMemo(() => contestQuery.data ?? [], [contestQuery.data]);
  const filteredContests =
    stateFilter === "ALL" ? contests : contests.filter((contest) => contest.state === stateFilter);

  const contestIdForQuery = activeContestId ?? contests[0]?.id;
  const selectedContest = contests.find((contest) => contest.id === contestIdForQuery);
  const clarificationsQuery = trpc.staff.contests.clarifications.useQuery(
    { contestId: contestIdForQuery ?? "" },
    { enabled: Boolean(contestIdForQuery) },
  );
  const clarificationList = useMemo(
    () => clarificationsQuery.data ?? [],
    [clarificationsQuery.data],
  );
  const openClarifications = clarificationList.filter((entry) => entry.status !== "CLOSED");
  const metrics = useMemo(
    () => buildContestMetrics(contests, clarificationList),
    [contests, clarificationList],
  );

  const answerMutation = trpc.staff.contests.answerClarification.useMutation({
    onSuccess: () => {
      if (contestIdForQuery) {
        utils.staff.contests.clarifications.invalidate({ contestId: contestIdForQuery });
      }
      toast.success("Clarification updated");
      setRespondingTo(null);
      setResponseText("");
    },
    onError: (error) => toast.error(error.message),
  });

  const contestColumns = useMemo<DataTableColumn<ContestRecord>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Contest" />,
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.name}</p>
            <p className="text-xs text-muted-foreground">/{row.original.slug}</p>
          </div>
        ),
      },
      {
        accessorKey: "startsAt",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Window" />,
        cell: ({ row }) => (
          <div className="text-sm">
            {format(new Date(row.original.startsAt), "MMM d, HH:mm")}
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(row.original.startsAt), { addSuffix: true })}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "type",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
        cell: ({ row }) => (
          <Badge variant="outline" className="uppercase text-[11px]">
            {row.original.type}
          </Badge>
        ),
      },
      {
        accessorKey: "state",
        header: ({ column }) => <DataTableColumnHeader column={column} title="State" />,
        cell: ({ row }) => (
          <Badge className={cn("capitalize", contestStateClasses[row.original.state])}>
            {row.original.state.toLowerCase()}
          </Badge>
        ),
      },
      {
        id: "actions",
        header: "",
        enableHiding: false,
        enableSorting: false,
        cell: ({ row }) => (
          <Button asChild variant="ghost" size="sm" className="text-primary">
            <Link href={`/contests?slug=${row.original.slug}`}>Monitor</Link>
          </Button>
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase text-muted-foreground">Control room</p>
          <h1 className="text-3xl font-semibold tracking-tight">Contest operations</h1>
          <p className="text-sm text-muted-foreground">
            Monitor schedules, clarify issues, and broadcast announcements without leaving this
            view.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" className="gap-2" onClick={() => contestQuery.refetch()}>
            <Timer01Icon className="h-4 w-4" />
            Sync timeline
          </Button>
          <Button asChild className="gap-2">
            <Link href="/staff/contests/new">
              <SparklesIcon className="h-4 w-4" />
              Launch contest
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {metrics.map((metric) => (
          <Card key={metric.label}>
            <CardContent className="flex items-center justify-between gap-4 py-5">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {metric.label}
                </p>
                <p className="mt-2 text-3xl font-semibold">{metric.value}</p>
                <p className="text-sm text-muted-foreground">{metric.meta}</p>
              </div>
              <metric.icon className={cn("h-12 w-12 rounded-2xl bg-primary/10 p-3", metric.tone)} />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>Contest schedule</CardTitle>
                <CardDescription>
                  Click any row to focus its clarifications and broadcast tools.
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Select
                  value={stateFilter}
                  onValueChange={(value) => setStateFilter(value as typeof stateFilter)}
                >
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="State filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All states</SelectItem>
                    {Array.from(new Set(contests.map((contest) => contest.state))).map((state) => (
                      <SelectItem key={state} value={state}>
                        {state.toLowerCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Badge variant="outline" className="gap-1 text-xs">
                  <FilterIcon className="h-3.5 w-3.5" />
                  {stateFilter === "ALL" ? "No filter" : stateFilter.toLowerCase()}
                </Badge>
              </div>
            </div>
            {selectedContest ? (
              <p className="text-xs text-muted-foreground">
                Focused on{" "}
                <span className="font-medium text-foreground">{selectedContest.name}</span> for
                clarifications.
              </p>
            ) : null}
          </CardHeader>
          <CardContent>
            {contestQuery.isLoading ? (
              <Skeleton className="h-64 w-full rounded-xl" />
            ) : contestQuery.isError ? (
              <Alert variant="destructive">
                <AlertTitle>Unable to load contests</AlertTitle>
                <AlertDescription>
                  {contestQuery.error?.message ?? "Please try again shortly."}
                </AlertDescription>
              </Alert>
            ) : contests.length === 0 ? (
              <div className="rounded-2xl border border-dashed p-10 text-center">
                <Calendar02Icon className="mx-auto h-10 w-10 text-muted-foreground" />
                <p className="mt-4 text-sm text-muted-foreground">
                  No contests scheduled. Create one to unlock monitoring tools.
                </p>
                <Button asChild className="mt-4">
                  <Link href="/staff/contests/new">Create first contest</Link>
                </Button>
              </div>
            ) : (
              <DataTable
                columns={contestColumns}
                data={filteredContests}
                searchKey="name"
                searchPlaceholder="Search name or slug…"
                onRowClick={(contest) => setActiveContestId(contest.id)}
                emptyMessage="No contests match this filter."
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Focused contest</CardTitle>
            <CardDescription>
              Snapshot of the contest whose clarifications stream into this dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedContest ? (
              <>
                <div className="flex flex-wrap gap-2">
                  <Badge className={cn("capitalize", contestStateClasses[selectedContest.state])}>
                    {selectedContest.state.toLowerCase()}
                  </Badge>
                  <Badge variant="secondary" className="uppercase text-[11px]">
                    {selectedContest.type}
                  </Badge>
                </div>
                <div className="rounded-2xl border bg-muted/50 p-4 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Start</span>
                    <span className="font-medium">
                      {format(new Date(selectedContest.startsAt), "MMM d, yyyy HH:mm")}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-muted-foreground">Countdown</span>
                    <span className="font-medium">
                      {formatDistanceToNow(new Date(selectedContest.startsAt), { addSuffix: true })}
                    </span>
                  </div>
                </div>
                <Button asChild variant="outline" className="w-full">
                  <Link href={`/contests?slug=${selectedContest.slug}`}>Open public page</Link>
                </Button>
                <div className="space-y-2 text-xs text-muted-foreground">
                  <p className="flex items-center gap-2">
                    <Flag01Icon className="h-4 w-4 text-primary" />
                    {selectedContest.slug}
                  </p>
                  <p className="flex items-center gap-2">
                    <UserGroupIcon className="h-4 w-4 text-primary" />
                    Ops crew receives a ping when you focus a contest here.
                  </p>
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-dashed p-8 text-center">
                <Alert01Icon className="mx-auto h-10 w-10 text-muted-foreground" />
                <p className="mt-4 text-sm text-muted-foreground">
                  Select a contest from the schedule to inspect details.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="gap-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <CardTitle>Clarification tower</CardTitle>
              <CardDescription>
                Every question routed through ops shows up here with state, scope, and triage
                actions.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Select
                value={contestIdForQuery ?? ""}
                onValueChange={(value) => setActiveContestId(value)}
                disabled={contests.length === 0}
              >
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Select contest" />
                </SelectTrigger>
                <SelectContent>
                  {contests.map((contest) => (
                    <SelectItem key={contest.id} value={contest.id}>
                      {contest.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Badge variant="secondary" className="gap-1 text-xs">
                <Message01Icon className="h-3.5 w-3.5" />
                {clarificationsQuery.isLoading ? "syncing…" : `${openClarifications.length} open`}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!contestIdForQuery ? (
            <Alert>
              <AlertTitle>No contest selected</AlertTitle>
              <AlertDescription>
                Pick a contest above to pull down its clarifications and broadcast responses.
              </AlertDescription>
            </Alert>
          ) : clarificationsQuery.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
            </div>
          ) : clarificationsQuery.isError ? (
            <Alert variant="destructive">
              <AlertTitle>Clarifications unavailable</AlertTitle>
              <AlertDescription>
                {clarificationsQuery.error?.message ?? "Please reselect the contest to refresh."}
              </AlertDescription>
            </Alert>
          ) : clarificationList.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-10 text-center">
              <Message01Icon className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="mt-4 text-sm text-muted-foreground">No clarifications yet.</p>
            </div>
          ) : (
            clarificationList.map((item) => (
              <ClarificationCard
                key={item.id}
                item={item}
                onRespond={() => {
                  setRespondingTo(item);
                  setResponseText(item.answer ?? "");
                  setResponseVisibility(item.visibility);
                  setResponseStatus(item.status);
                }}
              />
            ))
          )}
        </CardContent>
      </Card>

      <ClarificationResponseDialog
        open={Boolean(respondingTo)}
        clarification={respondingTo}
        responseText={responseText}
        responseVisibility={responseVisibility}
        responseStatus={responseStatus}
        onOpenChange={(open) => {
          if (!open) {
            setRespondingTo(null);
            setResponseText("");
          }
        }}
        onChangeResponseText={setResponseText}
        onChangeVisibility={(value) => setResponseVisibility(value)}
        onChangeStatus={(value) => setResponseStatus(value)}
        onSubmit={() => {
          if (!respondingTo || !contestIdForQuery) {
            return;
          }
          answerMutation.mutate({
            contestId: contestIdForQuery,
            clarificationId: respondingTo.id,
            answer: responseText,
            visibility: responseVisibility,
            status: responseStatus,
          });
        }}
        loading={answerMutation.isPending}
      />
    </div>
  );
}

function ClarificationCard({
  item,
  onRespond,
}: {
  item: ClarificationRecord;
  onRespond: () => void;
}) {
  return (
    <div className="rounded-2xl border bg-background/70 p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{item.problem?.label ?? "General"}</Badge>
            <Badge className={cn("capitalize", clarificationStatusClasses[item.status])}>
              {item.status.toLowerCase()}
            </Badge>
            <Badge className={cn("capitalize", visibilityClasses[item.visibility])}>
              {item.visibility.toLowerCase()}
            </Badge>
          </div>
          <p className="text-sm font-medium text-foreground">{item.question}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onRespond}>
          Reply
        </Button>
      </div>
      {item.answer ? (
        <div className="mt-3 rounded-xl border bg-muted/50 p-3 text-sm">
          <p className="text-xs uppercase text-muted-foreground">Answer</p>
          <p>{item.answer}</p>
        </div>
      ) : null}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          {item.author.handle ?? item.author.name ?? "User"} •{" "}
          {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
        </span>
        <span>{item.problem?.label ?? "Broadcast"}</span>
      </div>
    </div>
  );
}

type ClarificationDialogProps = {
  open: boolean;
  clarification: ClarificationRecord | null;
  responseText: string;
  responseVisibility: ClarificationVisibility;
  responseStatus: ClarificationStatus;
  loading: boolean;
  onOpenChange: (open: boolean) => void;
  onChangeResponseText: (value: string) => void;
  onChangeVisibility: (value: ClarificationVisibility) => void;
  onChangeStatus: (value: ClarificationStatus) => void;
  onSubmit: () => void;
};

function ClarificationResponseDialog({
  open,
  clarification,
  responseText,
  responseStatus,
  responseVisibility,
  loading,
  onOpenChange,
  onChangeResponseText,
  onChangeStatus,
  onChangeVisibility,
  onSubmit,
}: ClarificationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Respond to clarification</DialogTitle>
          <DialogDescription>{clarification?.question}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label className="text-xs uppercase">Visibility</Label>
            <Select
              value={responseVisibility}
              onValueChange={(value) => onChangeVisibility(value as ClarificationVisibility)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PRIVATE">Private</SelectItem>
                <SelectItem value="PUBLIC">Broadcast</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label className="text-xs uppercase">Status</Label>
            <Select
              value={responseStatus}
              onValueChange={(value) => onChangeStatus(value as ClarificationStatus)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="OPEN">Open</SelectItem>
                <SelectItem value="ANSWERED">Answered</SelectItem>
                <SelectItem value="ANNOUNCED">Announced</SelectItem>
                <SelectItem value="CLOSED">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label className="text-xs uppercase">Answer</Label>
            <Textarea
              rows={4}
              value={responseText}
              onChange={(event) => onChangeResponseText(event.target.value)}
              placeholder="Keep it concise. Contestants see exactly what you see here."
            />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={onSubmit}
            disabled={!clarification || !responseText.trim() || loading}
            className="gap-2"
          >
            {loading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : null}
            Broadcast update
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type ContestMetric = {
  label: string;
  value: string;
  meta: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  tone: string;
};

function buildContestMetrics(
  contests: ContestRecord[],
  clarifications: ClarificationRecord[],
): ContestMetric[] {
  const running = contests.filter((contest) => contest.state === "RUNNING");
  const upcoming = contests
    .filter((contest) => contest.state === "UPCOMING")
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  const latestClarification = [...clarifications].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )[0];

  return [
    {
      label: "Scheduled windows",
      value: contests.length.toString().padStart(2, "0"),
      meta: upcoming[0]
        ? `Next ${format(new Date(upcoming[0].startsAt), "MMM d, HH:mm")}`
        : "No upcoming windows",
      icon: Calendar02Icon,
      tone: "text-blue-600 dark:text-blue-300",
    },
    {
      label: "Running now",
      value: running.length.toString(),
      meta: running[0] ? running[0].name : "Idle — no contest live",
      icon: Timer01Icon,
      tone: "text-emerald-600 dark:text-emerald-300",
    },
    {
      label: "Clarification load",
      value: clarifications.length.toString(),
      meta: latestClarification
        ? `Last update ${formatDistanceToNow(new Date(latestClarification.createdAt), {
            addSuffix: true,
          })}`
        : "No activity yet",
      icon: Message01Icon,
      tone: "text-amber-600 dark:text-amber-300",
    },
  ];
}
