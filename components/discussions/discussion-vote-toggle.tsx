"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowBigDown, ArrowBigUp } from "@/components/icons";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type DiscussionVoteToggleProps = {
  discussionId: string;
  initialScore: number;
  initialVote?: -1 | 0 | 1;
  size?: "sm" | "md";
};

export function DiscussionVoteToggle({
  discussionId,
  initialScore,
  initialVote = 0,
  size = "md",
}: DiscussionVoteToggleProps) {
  const utils = trpc.useUtils();
  const [score, setScore] = useState(initialScore);
  const [vote, setVote] = useState<-1 | 0 | 1>(initialVote);
  const mutation = trpc.discussions.vote.useMutation({
    onError: (error) => {
      toast.error(error.message ?? "Unable to vote");
      setScore(initialScore);
      setVote(initialVote);
    },
    onSettled: () => {
      void Promise.all([
        utils.discussions.listByProblem.invalidate(),
        utils.discussions.listGlobal.invalidate(),
        utils.discussions.thread.invalidate({ id: discussionId }),
      ]);
    },
  });

  const handleVote = (direction: "UP" | "DOWN") => {
    const value = direction === "UP" ? 1 : -1;
    const nextVote = vote === value ? 0 : value;
    const delta = nextVote === 0 ? -vote : nextVote - vote;
    setVote(nextVote);
    setScore((prev) => prev + delta);
    mutation.mutate({ discussionId, direction });
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/70 px-3",
        size === "sm" && "px-2 text-xs",
      )}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn(
          "h-8 w-8 rounded-full",
          vote === 1 ? "bg-primary/10 text-primary" : "text-muted-foreground",
          size === "sm" && "h-7 w-7 text-xs",
        )}
        disabled={mutation.isPending}
        onClick={() => handleVote("UP")}
      >
        <ArrowBigUp className="h-4 w-4" />
      </Button>
      <span className={cn("text-sm font-semibold", vote !== 0 && "text-primary")}>{score}</span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn(
          "h-8 w-8 rounded-full",
          vote === -1 ? "bg-destructive/10 text-destructive" : "text-muted-foreground",
          size === "sm" && "h-7 w-7 text-xs",
        )}
        disabled={mutation.isPending}
        onClick={() => handleVote("DOWN")}
      >
        <ArrowBigDown className="h-4 w-4" />
      </Button>
    </div>
  );
}
