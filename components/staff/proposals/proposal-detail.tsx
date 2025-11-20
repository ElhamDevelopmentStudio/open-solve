"use client";

import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "@/components/icons";
import { toast } from "sonner";

export function StaffProposalDetail({ proposalId }: { proposalId: string }) {
  const utils = trpc.useUtils();
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
        window.location.href = `/staff/problems/${result.problemId}`;
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
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase text-muted-foreground">{data.slug}</p>
          <h1 className="text-2xl font-semibold">{data.title}</h1>
          <p className="text-sm text-muted-foreground">
            Proposed by {data.author.handle ?? data.author.name} ·{" "}
            {data.intendedDifficulty ?? "Unspecified"}
          </p>
        </div>
        <Badge variant="outline">{data.status.toLowerCase()}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Statement</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          <p>{data.statement}</p>
          <div>
            <p className="font-medium text-foreground">Samples</p>
            <div className="space-y-2">
              {(data.samples as Array<{ input: string; output: string }>)?.map((sample, index) => (
                <div key={index} className="rounded-xl border border-white/5 bg-muted/10 p-3">
                  <p className="text-xs uppercase text-muted-foreground">Example {index + 1}</p>
                  <div className="mt-2 grid gap-2 md:grid-cols-2">
                    <pre className="rounded-md bg-background/80 p-2 text-xs">{sample.input}</pre>
                    <pre className="rounded-md bg-background/80 p-2 text-xs">{sample.output}</pre>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Discussion</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {data.comments.map((commentEntry) => (
              <div
                key={commentEntry.id}
                className="rounded-lg border border-white/5 bg-muted/10 p-3"
              >
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{commentEntry.author.handle ?? commentEntry.author.name}</span>
                  <span>{new Date(commentEntry.createdAt).toLocaleString()}</span>
                </div>
                <p className="text-sm text-foreground">{commentEntry.body}</p>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <Textarea
              placeholder="Leave feedback for the author..."
              value={comment}
              onChange={(event) => setComment(event.target.value)}
            />
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={() => commentMutation.mutate({ proposalId, body: comment })}
                disabled={comment.length < 5 || commentMutation.isPending}
              >
                {commentMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Send feedback
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => changeStatus("PRESCREEN")}>
            Mark as prescreened
          </Button>
          <Button variant="outline" onClick={() => changeStatus("IN_REVIEW")}>
            Move to review
          </Button>
          <Button variant="outline" onClick={() => changeStatus("CHANGES_REQUESTED")}>
            Request changes
          </Button>
          <Button variant="default" onClick={() => changeStatus("ACCEPTED")}>
            Accept (credit contributor)
          </Button>
          <Button variant="ghost" onClick={() => changeStatus("REJECTED")}>
            Reject
          </Button>
          <Button onClick={() => convert.mutate({ proposalId })} disabled={convert.isPending}>
            Create draft
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
