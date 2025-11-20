"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { ProblemProposalStatus } from "@prisma/client";

import { Loader2, MessageSquareText, Send, Shield, Sparkles, Trash2 } from "@/components/icons";
import { trpc } from "@/lib/trpc/client";
import { staffConfig } from "@/config/staff";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import type { IconComponent } from "@/components/icons";

const statusVariants: Record<
  ProblemProposalStatus,
  "info" | "warning" | "success" | "destructive" | "default"
> = {
  SUBMITTED: "info",
  PRESCREEN: "info",
  IN_REVIEW: "warning",
  ACCEPTED: "success",
  CHANGES_REQUESTED: "warning",
  REJECTED: "destructive",
};

export function StaffProposalDetail({ proposalId }: { proposalId: string }) {
  const utils = trpc.useUtils();
  const router = useRouter();
  const { data, isLoading } = trpc.proposals.staffGet.useQuery({ id: proposalId });
  const updateStatus = trpc.proposals.staffUpdateStatus.useMutation({
    onSuccess: () => {
      utils.proposals.staffGet.invalidate({ id: proposalId });
      utils.proposals.staffList.invalidate();
      toast.success("Status updated");
    },
  });
  const convert = trpc.proposals.convertToDraft.useMutation({
    onSuccess: (result) => {
      toast.success("Draft created");
      if (result.problemId) {
        router.push(`/staff/problems/${result.problemId}`);
      }
    },
  });
  const commentMutation = trpc.proposals.comment.useMutation({
    onSuccess: () => {
      utils.proposals.staffGet.invalidate({ id: proposalId });
      setComment("");
    },
  });
  const [comment, setComment] = useState("");

  if (isLoading || !data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const changeStatus = (status: typeof data.status, message?: string) => {
    updateStatus.mutate({ proposalId, status, message });
  };

  return (
    <div className="mx-auto max-w-screen-xl space-y-8 px-4 pb-10 font-mono text-foreground lg:px-10">
      <section className="border-2 border-border bg-card p-6 shadow-sm shadow-primary/20 md:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.3em] text-primary/80">
              {staffConfig.proposals.detail.marker}
              <Badge className="rounded-none border-2 border-border bg-background px-2 py-1 text-[10px] tracking-[0.2em] text-muted-foreground">
                {data.slug}
              </Badge>
            </div>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
              {data.title}
            </h1>
            <p className="text-sm text-muted-foreground">
              Proposed by {data.author.handle ?? data.author.name} · {data.intendedDifficulty}
            </p>
            <p className="text-xs text-muted-foreground">
              Submitted {formatDistanceToNow(new Date(data.createdAt), { addSuffix: true })}
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge variant={statusVariants[data.status]} className="border-2 uppercase">
                {data.status.replace("_", " ").toLowerCase()}
              </Badge>
              {data.reviewer ? (
                <Badge variant="outline" className="border-2 border-border uppercase">
                  Reviewer: {data.reviewer.handle ?? data.reviewer.name}
                </Badge>
              ) : (
                <Badge variant="outline" className="border-2 border-border uppercase">
                  Unassigned
                </Badge>
              )}
            </div>
          </div>
          <div className="grid h-full w-full gap-px bg-border/60 sm:grid-cols-2 lg:w-[460px]">
            <div className="bg-background p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary/80">
                Comments
              </p>
              <p className="text-2xl font-black">{data.comments.length}</p>
              <p className="text-xs text-muted-foreground">review thread</p>
            </div>
            <div className="bg-background p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary/80">
                Samples
              </p>
              <p className="text-2xl font-black">{(data.samples as Array<unknown>).length}</p>
              <p className="text-xs text-muted-foreground">provided</p>
            </div>
            <div className="bg-background p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary/80">
                Originality
              </p>
              <p className="text-2xl font-black">{data.originalityConfirmed ? "Yes" : "No"}</p>
              <p className="text-xs text-muted-foreground">self-attested</p>
            </div>
            <div className="bg-background p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary/80">
                Status
              </p>
              <p className="text-2xl font-black">{data.status.replace("_", " ")}</p>
              <p className="text-xs text-muted-foreground">current state</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <Card className="border-2 border-border">
            <CardHeader className="border-b-2 border-border">
              <CardTitle className="text-xl font-black">Statement</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm leading-relaxed text-muted-foreground">
              <p className="whitespace-pre-line text-foreground">{data.statement}</p>
              <div className="space-y-3">
                <p className="text-sm font-bold uppercase text-primary/80">
                  {staffConfig.proposals.detail.samplesTitle}
                </p>
                <div className="space-y-3">
                  {(data.samples as Array<{ input: string; output: string }>)?.map(
                    (sample, index) => (
                      <div key={index} className="border-2 border-border bg-accent/20 p-3">
                        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                          Example {index + 1}
                        </p>
                        <div className="mt-3 grid gap-px bg-border/60 md:grid-cols-2">
                          <div className="bg-background p-3">
                            <p className="text-xs uppercase text-muted-foreground">Input</p>
                            <pre className="mt-2 overflow-x-auto text-xs text-foreground">
                              {sample.input}
                            </pre>
                          </div>
                          <div className="bg-background p-3">
                            <p className="text-xs uppercase text-muted-foreground">Output</p>
                            <pre className="mt-2 overflow-x-auto text-xs text-foreground">
                              {sample.output}
                            </pre>
                          </div>
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-border">
            <CardHeader className="border-b-2 border-border">
              <CardTitle className="text-xl font-black">Discussion</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {data.comments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {staffConfig.proposals.detail.commentsEmpty}
                  </p>
                ) : (
                  data.comments.map((commentEntry) => (
                    <div key={commentEntry.id} className="border-2 border-border bg-accent/20 p-3">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{commentEntry.author.handle ?? commentEntry.author.name}</span>
                        <span>
                          {formatDistanceToNow(new Date(commentEntry.createdAt), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-foreground">{commentEntry.body}</p>
                    </div>
                  ))
                )}
              </div>
              <div className="space-y-2">
                <Textarea
                  placeholder={staffConfig.proposals.detail.commentPlaceholder}
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                />
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    className="border-2 border-primary px-4"
                    onClick={() => commentMutation.mutate({ proposalId, body: comment })}
                    disabled={comment.length < 5 || commentMutation.isPending}
                  >
                    {commentMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="mr-2 h-4 w-4" />
                    )}
                    Send feedback
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-2 border-border">
            <CardHeader className="border-b-2 border-border">
              <CardTitle className="text-xl font-black">Workflow</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ActionRow
                icon={Shield}
                label={staffConfig.proposals.detail.actions.prescreen}
                onConfirm={() => changeStatus("PRESCREEN")}
                confirmTitle={staffConfig.proposals.detail.confirm.prescreen}
                confirmDescription={staffConfig.proposals.detail.confirmDetails.prescreen}
                loading={updateStatus.isPending}
              />
              <ActionRow
                icon={Shield}
                label={staffConfig.proposals.detail.actions.review}
                onConfirm={() => changeStatus("IN_REVIEW")}
                confirmTitle={staffConfig.proposals.detail.confirm.review}
                confirmDescription={staffConfig.proposals.detail.confirmDetails.review}
                loading={updateStatus.isPending}
              />
              <ActionRow
                icon={MessageSquareText}
                label={staffConfig.proposals.detail.actions.requestChanges}
                onConfirm={() => changeStatus("CHANGES_REQUESTED")}
                confirmTitle={staffConfig.proposals.detail.confirm.requestChanges}
                confirmDescription={staffConfig.proposals.detail.confirmDetails.requestChanges}
                loading={updateStatus.isPending}
                variant="warning"
              />
              <ActionRow
                icon={Sparkles}
                label={staffConfig.proposals.detail.actions.accept}
                onConfirm={() => changeStatus("ACCEPTED")}
                confirmTitle={staffConfig.proposals.detail.confirm.accept}
                confirmDescription={staffConfig.proposals.detail.confirmDetails.accept}
                loading={updateStatus.isPending}
              />
              <ActionRow
                icon={Trash2}
                label={staffConfig.proposals.detail.actions.reject}
                onConfirm={() => changeStatus("REJECTED")}
                confirmTitle={staffConfig.proposals.detail.confirm.reject}
                confirmDescription={staffConfig.proposals.detail.confirmDetails.reject}
                loading={updateStatus.isPending}
                variant="destructive"
              />
              <ActionRow
                icon={Sparkles}
                label={staffConfig.proposals.detail.actions.convert}
                onConfirm={() => convert.mutate({ proposalId })}
                confirmTitle={staffConfig.proposals.detail.confirm.convert}
                confirmDescription={staffConfig.proposals.detail.confirmDetails.convert}
                loading={convert.isPending}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ActionRow({
  icon: Icon,
  label,
  onConfirm,
  confirmTitle,
  confirmDescription,
  loading,
  variant = "default",
}: {
  icon: IconComponent;
  label: string;
  onConfirm: () => void;
  confirmTitle: string;
  confirmDescription?: string;
  loading?: boolean;
  variant?: "default" | "warning" | "destructive";
}) {
  return (
    <ConfirmDialog
      title={confirmTitle}
      description={confirmDescription}
      confirmLabel={label}
      loading={loading}
      variant={variant}
      trigger={
        <Button
          variant={variant === "destructive" ? "destructive" : "outline"}
          className="w-full justify-between border-2 border-border px-4"
          disabled={loading}
        >
          <span className="flex items-center gap-2 text-left text-sm font-bold uppercase">
            <Icon className="h-4 w-4" /> {label}
          </span>
          <span className="text-xs text-muted-foreground">Confirm</span>
        </Button>
      }
      onConfirm={onConfirm}
    />
  );
}
