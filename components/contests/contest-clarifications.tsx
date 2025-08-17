"use client";

import { contestsConfig } from "@/config/contests";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { trpc } from "@/lib/trpc/client";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { contestDetailQueryOptions } from "@/lib/react-query/policies";
import { ArrowLeft } from "@/components/icons";

type ContestClarificationsProps = {
  slug: string;
};

const clarificationsConfig = contestsConfig.clarifications;

export const ContestClarifications = ({ slug }: ContestClarificationsProps) => {
  const utils = trpc.useUtils();
  const detail = trpc.contests.detail.useQuery({ slug }, contestDetailQueryOptions);
  const clarifications = trpc.contests.clarifications.useQuery(
    { contestId: detail.data?.contest.id ?? "" },
    {
      enabled: Boolean(detail.data?.contest.id),
      staleTime: contestDetailQueryOptions.staleTime,
      gcTime: contestDetailQueryOptions.gcTime,
    },
  );

  const [clarificationQuestion, setClarificationQuestion] = useState("");
  const [clarificationProblemId, setClarificationProblemId] = useState<string>("general");

  const clarificationMutation = trpc.contests.submitClarification.useMutation({
    onSuccess: () => {
      const contestId = detail.data?.contest.id;
      if (contestId) {
        utils.contests.clarifications.invalidate({ contestId });
      }
      setClarificationQuestion("");
      setClarificationProblemId("general");
      toast.success("Clarification submitted");
    },
    onError: (error) => toast.error(error.message),
  });

  const handleClarificationSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!detail.data?.contest || clarificationQuestion.trim().length < 8) {
      toast.error("Question too short");
      return;
    }
    clarificationMutation.mutate({
      contestId: detail.data.contest.id,
      problemId: clarificationProblemId === "general" ? undefined : clarificationProblemId,
      question: clarificationQuestion.trim(),
    });
  };

  if (detail.isLoading) {
    return (
      <div className="space-y-6 font-mono">
        <Skeleton className="h-40 w-full border-2 border-border" />
        <Skeleton className="h-64 w-full border-2 border-border" />
      </div>
    );
  }

  if (!detail.data) {
    return null;
  }

  const contest = detail.data.contest;
  const viewerRegistration = detail.data.viewerRegistration;
  const canSubmitClarification =
    Boolean(viewerRegistration) && (contest.state === "UPCOMING" || contest.state === "RUNNING");

  const clarificationList = clarifications.data ?? [];

  return (
    <div className="space-y-10 font-mono text-foreground">
      <section className="border-2 border-border bg-card p-6 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild variant="ghost" size="sm" className="text-xs font-bold uppercase">
            <Link href={`/contests/${slug}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to contest
            </Link>
          </Button>
          <Badge variant="outline" className="text-[10px] uppercase">
            {contest.name}
          </Badge>
        </div>
        <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-primary/70">
          {clarificationsConfig.hero.marker}
        </p>
        <h1 className="text-4xl font-black tracking-tight">{clarificationsConfig.hero.title}</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          {clarificationsConfig.hero.description}
        </p>
      </section>

      <section className="border-2 border-border bg-card p-6 space-y-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-primary/70">
          {clarificationsConfig.form.marker}
        </p>
        <h2 className="text-2xl font-black tracking-tight">{clarificationsConfig.form.title}</h2>
        <form onSubmit={handleClarificationSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="clarification-problem" className="text-xs font-bold uppercase">
              {clarificationsConfig.form.problemLabel}
            </Label>
            <Select value={clarificationProblemId} onValueChange={setClarificationProblemId}>
              <SelectTrigger id="clarification-problem" className="border-2 border-border">
                <SelectValue placeholder={clarificationsConfig.form.generalOption} />
              </SelectTrigger>
              <SelectContent className="rounded-none border-2 border-border bg-card">
                <SelectItem value="general">{clarificationsConfig.form.generalOption}</SelectItem>
                {detail.data.problems.map((problem) => (
                  <SelectItem key={problem.id} value={problem.id}>
                    {problem.label} · {problem.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="clarification-question" className="text-xs font-bold uppercase">
              {clarificationsConfig.form.bodyLabel}
            </Label>
            <Textarea
              id="clarification-question"
              rows={4}
              value={clarificationQuestion}
              onChange={(event) => setClarificationQuestion(event.target.value)}
              placeholder={clarificationsConfig.form.placeholder}
              className="resize-none border-2 border-border"
            />
            <p className="text-xs text-muted-foreground">
              {canSubmitClarification
                ? clarificationsConfig.form.helperRegistered
                : clarificationsConfig.form.helperUnregistered}
            </p>
          </div>

          <div className="flex items-center justify-end">
            <Button
              type="submit"
              disabled={
                !canSubmitClarification ||
                clarificationQuestion.trim().length < 8 ||
                clarificationMutation.isPending
              }
              className="h-11 px-6 text-xs font-bold uppercase"
            >
              {clarificationMutation.isPending
                ? clarificationsConfig.form.pendingLabel
                : clarificationsConfig.form.submitLabel}
            </Button>
          </div>
        </form>
      </section>

      <section className="space-y-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-primary/70">
          {clarificationsConfig.form.listTitle}
        </p>
        {clarifications.isLoading ? (
          <Skeleton className="h-64 w-full border-2 border-border" />
        ) : clarificationList.length === 0 ? (
          <div className="border-2 border-border bg-card p-10 text-center text-sm text-muted-foreground">
            {clarificationsConfig.form.listEmpty}
          </div>
        ) : (
          <div className="space-y-4">
            {clarificationList.map((item) => (
              <div key={item.id} className="border-2 border-border bg-card p-5">
                <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase text-muted-foreground">
                  <span>{item.problem?.label ?? clarificationsConfig.form.generalOption}</span>
                  <span>•</span>
                  <span>{formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}</span>
                </div>
                <p className="mt-2 text-sm font-bold">{item.question}</p>
                {item.answer ? (
                  <div className="mt-3 border border-border bg-background px-4 py-3 text-sm">
                    {item.answer}
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-muted-foreground">Awaiting response</p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
