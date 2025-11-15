"use client";

import { useEffect, useMemo, useState, type ComponentType, type SVGProps } from "react";
import { formatDistanceToNow } from "date-fns";
import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import {
  CodeSquareIcon,
  CpuSettingsIcon,
  LegalHammerIcon,
  Shield01Icon,
} from "hugeicons-react";
import { toast } from "sonner";

import type { AppRouter } from "@/lib/trpc/router";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
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
type RouterInputs = inferRouterInputs<AppRouter>;

type ManualQueueEntry = RouterOutputs["staff"]["judge"]["manualQueue"][number];
type ManualVerdictInput = RouterInputs["staff"]["judge"]["manualSetVerdict"];

export function ManualJudgeQueue() {
  const utils = trpc.useUtils();
  const queue = trpc.staff.judge.manualQueue.useQuery(
    { limit: 25 },
    {
      refetchInterval: 20000,
      refetchOnWindowFocus: false,
    },
  );
  const mutation = trpc.staff.judge.manualSetVerdict.useMutation({
    onSuccess: () => {
      toast.success("Verdict recorded");
      utils.staff.judge.manualQueue.invalidate();
    },
    onError: (error) => toast.error(error.message ?? "Unable to update verdict"),
  });

  const [languageFilter, setLanguageFilter] = useState<string>("ALL");
  const [problemFilter, setProblemFilter] = useState<string>("ALL");
  const [selectedId, setSelectedId] = useState<string>();

  const entries = queue.data ?? [];
  const filteredEntries = entries.filter((entry) => {
    const matchesLanguage =
      languageFilter === "ALL" || entry.language.displayName === languageFilter;
    const matchesProblem = problemFilter === "ALL" || entry.problem.title === problemFilter;
    return matchesLanguage && matchesProblem;
  });

  useEffect(() => {
    if (filteredEntries.length > 0 && !selectedId) {
      setSelectedId(filteredEntries[0].id);
    }
  }, [filteredEntries, selectedId]);

  const selectedEntry =
    filteredEntries.find((entry) => entry.id === selectedId) ?? filteredEntries[0];
  const metrics = useMemo(() => buildJudgeMetrics(entries), [entries]);
  const languages = Array.from(new Set(entries.map((entry) => entry.language.displayName)));
  const problems = Array.from(new Set(entries.map((entry) => entry.problem.title)));

  if (queue.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <div className="grid gap-6 lg:grid-cols-[320px,1fr]">
          <Skeleton className="h-[520px] rounded-2xl" />
          <Skeleton className="h-[520px] rounded-2xl" />
        </div>
      </div>
    );
  }

  if (queue.isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Unable to load queue</AlertTitle>
        <AlertDescription>{queue.error?.message ?? "Try refreshing again."}</AlertDescription>
      </Alert>
    );
  }

  if (entries.length === 0) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle>No pending submissions</CardTitle>
          <CardDescription>
            Manual queue is clear. Hybrid judge will drop new submissions here automatically.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => queue.refetch()}>Force refresh</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <QueueSummary metrics={metrics} lastUpdated={queue.dataUpdatedAt} onRefresh={() => queue.refetch()} />
      <div className="grid gap-6 lg:grid-cols-[320px,1fr]">
        <QueueSidebar
          entries={filteredEntries}
          languages={languages}
          problems={problems}
          selectedId={selectedEntry?.id}
          onSelect={setSelectedId}
          languageFilter={languageFilter}
          problemFilter={problemFilter}
          onChangeLanguageFilter={setLanguageFilter}
          onChangeProblemFilter={setProblemFilter}
          isRefreshing={queue.isFetching}
        />
        <ManualReviewPanel
          entry={selectedEntry}
          loading={mutation.isPending}
          onSubmit={mutation.mutateAsync}
        />
      </div>
    </div>
  );
}

function QueueSummary({
  metrics,
  lastUpdated,
  onRefresh,
}: {
  metrics: JudgeMetric[];
  lastUpdated: number;
  onRefresh: () => void;
}) {
  const refreshedAt = lastUpdated || Date.now();

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <CardTitle>Queue health</CardTitle>
          <CardDescription>Signal from the auto-judge before you dive into the code.</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={onRefresh}>
          Refresh now
        </Button>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-3">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-2xl border bg-muted/40 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{metric.label}</p>
              <metric.icon className={cn("h-5 w-5", metric.tone)} />
            </div>
            <p className="mt-3 text-2xl font-semibold">{metric.value}</p>
            <p className="text-xs text-muted-foreground">{metric.meta}</p>
          </div>
        ))}
        <p className="text-xs text-muted-foreground md:col-span-3">
          Last synced {formatDistanceToNow(new Date(refreshedAt), { addSuffix: true })}
        </p>
      </CardContent>
    </Card>
  );
}

function QueueSidebar({
  entries,
  languages,
  problems,
  selectedId,
  onSelect,
  languageFilter,
  problemFilter,
  onChangeLanguageFilter,
  onChangeProblemFilter,
  isRefreshing,
}: {
  entries: ManualQueueEntry[];
  languages: string[];
  problems: string[];
  selectedId?: string;
  onSelect: (id: string) => void;
  languageFilter: string;
  problemFilter: string;
  onChangeLanguageFilter: (value: string) => void;
  onChangeProblemFilter: (value: string) => void;
  isRefreshing: boolean;
}) {
  return (
    <Card className="h-full">
      <CardHeader className="space-y-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Pending submissions</CardTitle>
          <Badge variant="secondary" className="text-xs">
            {isRefreshing ? "syncing…" : `${entries.length} queued`}
          </Badge>
        </div>
        <div className="space-y-3 text-xs">
          <div className="space-y-1">
            <Label className="text-[11px] uppercase">Language</Label>
            <Select value={languageFilter} onValueChange={onChangeLanguageFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All languages</SelectItem>
                {languages.map((language) => (
                  <SelectItem key={language} value={language}>
                    {language}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] uppercase">Problem</Label>
            <Select value={problemFilter} onValueChange={onChangeProblemFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All problems</SelectItem>
                {problems.map((problem) => (
                  <SelectItem key={problem} value={problem}>
                    {problem}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[520px] px-4">
          <div className="space-y-3 pb-4">
            {entries.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => onSelect(entry.id)}
                className={cn(
                  "w-full rounded-2xl border px-3 py-4 text-left transition-colors",
                  selectedId === entry.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/40",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium leading-tight">{entry.problem.title}</p>
                  <Badge variant="outline">{entry.language.displayName}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {entry.user.handle} • {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
                </p>
                {entry.autoSummary ? (
                  <p className="mt-2 text-xs font-medium text-amber-600 dark:text-amber-300">
                    Auto: {entry.autoSummary.verdictCode} ({entry.autoSummary.passed}/{entry.autoSummary.total})
                  </p>
                ) : (
                  <p className="mt-2 text-xs text-muted-foreground">No telemetry attached</p>
                )}
              </button>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function ManualReviewPanel({
  entry,
  onSubmit,
  loading,
}: {
  entry: ManualQueueEntry | undefined;
  onSubmit: (payload: ManualVerdictInput) => Promise<unknown>;
  loading: boolean;
}) {
  const [notes, setNotes] = useState("");
  const [score, setScore] = useState<string>("");

  useEffect(() => {
    setNotes("");
    setScore("");
  }, [entry?.id]);

  if (!entry) {
    return (
      <Card className="h-full">
        <CardContent className="flex h-full items-center justify-center">
          <p className="text-sm text-muted-foreground">Select a submission from the queue.</p>
        </CardContent>
      </Card>
    );
  }

  const autoSummary = entry.autoSummary;

  const handleVerdict = async (verdict: ManualVerdictInput["verdict"]) => {
    await onSubmit({
      submissionId: entry.id,
      verdict,
      notes: notes.trim() ? notes : undefined,
      score: score ? Number(score) : undefined,
    });
    setNotes("");
    setScore("");
  };

  return (
    <Card className="h-full">
      <CardHeader className="gap-2">
        <CardTitle className="text-2xl">{entry.problem.title}</CardTitle>
        <CardDescription>
          {entry.user.handle} • {entry.language.displayName} • submission {entry.id}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 md:grid-cols-3">
          <Badge variant="outline" className="justify-center">
            <Shield01Icon className="mr-1 h-3.5 w-3.5" />
            Hybrid required
          </Badge>
          <Badge variant="outline" className="justify-center">
            <CodeSquareIcon className="mr-1 h-3.5 w-3.5" />
            {entry.language.displayName}
          </Badge>
          <Badge variant="outline" className="justify-center">
            <LegalHammerIcon className="mr-1 h-3.5 w-3.5" />
            {entry.problem.slug}
          </Badge>
        </div>
        {autoSummary ? (
          <div className="rounded-2xl border bg-muted/50 p-4 text-sm">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-foreground">Auto summary</p>
              <Badge variant="secondary">{autoSummary.verdictCode}</Badge>
            </div>
            <p className="mt-2 text-muted-foreground">
              {autoSummary.passed}/{autoSummary.total} tests • {autoSummary.runtimeMs}ms runtime
            </p>
          </div>
        ) : null}
        <div className="space-y-2 text-xs">
          <p className="font-semibold text-muted-foreground">Submission code</p>
          <ScrollArea className="h-64 rounded-2xl border bg-muted/40 p-4">
            <pre className="text-[11px] leading-relaxed text-muted-foreground">
              {entry.sourceCode || "// Source unavailable"}
            </pre>
          </ScrollArea>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-xs uppercase">Reviewer notes</Label>
            <Textarea
              rows={5}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Explain reasoning or steps performed."
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase">Score (0 – 100)</Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={score}
              onChange={(event) => setScore(event.target.value)}
              placeholder="Optional for partial credit"
            />
            <p className="text-xs text-muted-foreground">
              Leave blank for full accept/reject decisions.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button disabled={loading} onClick={() => handleVerdict("MANUAL_ACCEPTED")}>
            Approve submission
          </Button>
          <Button
            variant="secondary"
            disabled={loading}
            onClick={() => handleVerdict("MANUAL_PARTIAL")}
          >
            Award partial
          </Button>
          <Button
            variant="destructive"
            disabled={loading}
            onClick={() => handleVerdict("MANUAL_REJECTED")}
          >
            Reject
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

type JudgeMetric = {
  label: string;
  value: string;
  meta: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  tone: string;
};

function buildJudgeMetrics(entries: ManualQueueEntry[]): JudgeMetric[] {
  const languages = new Set(entries.map((entry) => entry.language.displayName)).size;
  const autoSummaries = entries.filter((entry) => Boolean(entry.autoSummary)).length;

  return [
    {
      label: "Pending cases",
      value: entries.length.toString(),
      meta: "Submissions awaiting a human verdict",
      icon: LegalHammerIcon,
      tone: "text-primary",
    },
    {
      label: "Languages affected",
      value: languages.toString(),
      meta: "Helps coordinate specialized reviewers",
      icon: CodeSquareIcon,
      tone: "text-blue-600 dark:text-blue-300",
    },
    {
      label: "Telemetry coverage",
      value: `${autoSummaries}/${entries.length}`,
      meta: "Entries with auto-summary context",
      icon: CpuSettingsIcon,
      tone: "text-amber-600 dark:text-amber-300",
    },
  ];
}
