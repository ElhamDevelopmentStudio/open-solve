"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { AlertCircle, ArrowLeft, Loader2, MessageCircle } from "@/components/icons";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { contestDetailQueryOptions } from "@/lib/react-query/policies";

type ContestClarificationsProps = {
  slug: string;
};

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
      toast.success("Clarification submitted", {
        description: "Your question has been sent to the staff",
      });
    },
    onError: (error) => {
      toast.error("Failed to submit", {
        description: error.message,
      });
    },
  });

  const handleClarificationSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!detail.data?.contest || clarificationQuestion.trim().length < 8) {
      toast.error("Question too short", {
        description: "Please provide more details (at least 8 characters)",
      });
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
      <div className="mx-auto max-w-4xl space-y-6 animate-fade-in">
        <Skeleton className="h-10 w-64 rounded-xl" />
        <div className="premium-card rounded-2xl p-8">
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!detail.data) {
    return null;
  }

  const contest = detail.data.contest;
  const viewerRegistration = detail.data.viewerRegistration;
  const canSubmitClarification =
    Boolean(viewerRegistration) &&
    (contest.state === "UPCOMING" || contest.state === "RUNNING");

  const clarificationList = clarifications.data ?? [];

  return (
    <div className="mx-auto max-w-4xl space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm" className="rounded-xl">
          <Link href={`/contests/${slug}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Contest
          </Link>
        </Button>
      </div>

      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">{contest.name} - Clarifications</h1>
        <p className="text-sm text-muted-foreground">
          Ask questions about the contest or problems. Staff will respond publicly when appropriate.
        </p>
      </div>

      <div className="premium-card space-y-6 rounded-2xl p-8">
        <div className="flex items-center gap-3">
          <MessageCircle className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Submit a Clarification</h2>
        </div>

        <form onSubmit={handleClarificationSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="clarification-problem" className="text-sm font-semibold">
              Problem Scope
            </Label>
            <Select value={clarificationProblemId} onValueChange={setClarificationProblemId}>
              <SelectTrigger id="clarification-problem" className="rounded-xl">
                <SelectValue placeholder="General question" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl">
                <SelectItem value="general">General Question</SelectItem>
                {detail.data.problems.map((problem) => (
                  <SelectItem key={problem.id} value={problem.id}>
                    {problem.label} · {problem.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="clarification-question" className="text-sm font-semibold">
              Your Question
            </Label>
            <Textarea
              id="clarification-question"
              rows={4}
              value={clarificationQuestion}
              onChange={(event) => setClarificationQuestion(event.target.value)}
              placeholder="Keep it concise and spoiler-free..."
              className="resize-none rounded-xl"
            />
            <p className="text-xs text-muted-foreground">
              {canSubmitClarification
                ? "Only staff can publish answers publicly"
                : "You must be registered to submit clarifications"}
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
              className="rounded-xl"
            >
              {clarificationMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send Clarification"
              )}
            </Button>
          </div>
        </form>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">All Clarifications</h2>

        {clarifications.isLoading ? (
          <div className="premium-card rounded-2xl p-8">
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
        ) : clarificationList.length === 0 ? (
          <div className="premium-card rounded-2xl p-12 text-center">
            <AlertCircle className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              No clarifications have been filed yet
            </p>
          </div>
        ) : (
          clarificationList.map((item) => (
            <div key={item.id} className="premium-card space-y-4 rounded-2xl p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="rounded-full">
                    {item.problem?.label ?? "General"}
                  </Badge>
                  {item.visibility === "PUBLIC" ? (
                    <Badge variant="secondary" className="rounded-full text-[10px] uppercase">
                      Public
                    </Badge>
                  ) : null}
                  {item.isMine ? (
                    <Badge variant="default" className="rounded-full text-[10px] uppercase">
                      Your Question
                    </Badge>
                  ) : null}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}</span>
                  <ClarificationStatusBadge status={item.status} />
                </div>
              </div>

              <div>
                <p className="text-sm font-medium">{item.question}</p>
              </div>

              {item.answer ? (
                <div className="space-y-2 rounded-xl border border-success/30 bg-success/5 p-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase text-success">Answer</span>
                    {item.answeredBy ? (
                      <span className="text-xs text-muted-foreground">
                        by {item.answeredBy.handle ?? item.answeredBy.name ?? "Staff"}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-sm">{item.answer}</p>
                  {item.answeredAt ? (
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(item.answeredAt), { addSuffix: true })}
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Awaiting staff response...</p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const ClarificationStatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, string> = {
    ANNOUNCED: "bg-primary/10 text-primary",
    ANSWERED: "bg-success/10 text-success",
    OPEN: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200",
    CLOSED: "bg-muted text-muted-foreground",
  };

  const labelMap: Record<string, string> = {
    ANNOUNCED: "Announced",
    ANSWERED: "Answered",
    OPEN: "Open",
    CLOSED: "Closed",
  };

  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
        styles[status] ?? "bg-muted text-muted-foreground"
      )}
    >
      {labelMap[status] ?? status.toLowerCase()}
    </span>
  );
};

