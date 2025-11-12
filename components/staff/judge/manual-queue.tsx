"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/lib/trpc/router";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type ManualQueueEntry = RouterOutputs["staff"]["judge"]["manualQueue"][number];
type RouterInputs = inferRouterInputs<AppRouter>;
type ManualVerdictInput = RouterInputs["staff"]["judge"]["manualSetVerdict"];

export function ManualJudgeQueue() {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.staff.judge.manualQueue.useQuery(
    { limit: 25 },
    {
      refetchInterval: 15000,
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

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading pending submissions…
      </div>
    );
  }

  if (!data || data.length === 0) {
    return <p className="text-sm text-muted-foreground">No submissions are awaiting manual review.</p>;
  }

  return (
    <div className="space-y-4">
      {data.map((entry) => (
        <ManualReviewCard key={entry.id} entry={entry} onSubmit={mutation.mutateAsync} loading={mutation.isPending} />
      ))}
    </div>
  );
}

function ManualReviewCard({
  entry,
  onSubmit,
  loading,
}: {
  entry: ManualQueueEntry;
  onSubmit: (payload: ManualVerdictInput) => Promise<unknown>;
  loading: boolean;
}) {
  const [notes, setNotes] = useState("");
  const [score, setScore] = useState<string>("");

  const handleVerdict = async (verdict: "MANUAL_ACCEPTED" | "MANUAL_REJECTED" | "MANUAL_PARTIAL") => {
    await onSubmit({
      submissionId: entry.id,
      verdict,
      notes: notes.trim() ? notes : undefined,
      score: score ? Number(score) : undefined,
    });
    setNotes("");
    setScore("");
  };

  const autoSummary = entry.autoSummary;

  return (
    <Card>
      <CardHeader className="flex flex-col space-y-2 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <CardTitle className="text-lg">
            {entry.problem.title}
            <span className="ml-2 text-sm text-muted-foreground">{entry.problem.slug}</span>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {entry.user.handle} • {entry.language.displayName}
          </p>
        </div>
        <Badge variant="secondary">Manual pending</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {autoSummary ? (
          <div className="rounded-lg border border-border/50 p-3 text-sm">
            <p className="font-medium text-foreground">Auto summary: {autoSummary.verdictCode}</p>
            <p className="text-muted-foreground">
              {autoSummary.passed}/{autoSummary.total} tests • {autoSummary.runtimeMs} ms
            </p>
          </div>
        ) : null}
        <div className="space-y-2 text-xs">
          <p className="font-semibold text-muted-foreground">Submission code</p>
          <pre className="max-h-48 overflow-auto rounded-lg border bg-muted/40 p-3 text-[11px] leading-relaxed">
            {entry.sourceCode || "// Source unavailable"}
          </pre>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase text-muted-foreground">Reviewer notes</label>
            <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={4} />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase text-muted-foreground">Score (0–100)</label>
            <Input
              type="number"
              min={0}
              max={100}
              value={score}
              onChange={(event) => setScore(event.target.value)}
              placeholder="Optional"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button disabled={loading} onClick={() => handleVerdict("MANUAL_ACCEPTED")}>
            Accept
          </Button>
          <Button
            variant="secondary"
            disabled={loading}
            onClick={() => handleVerdict("MANUAL_PARTIAL")}
          >
            Partial
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
