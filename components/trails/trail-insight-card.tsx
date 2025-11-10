"use client";

import type { TrailInsightPayload } from "@/lib/trails/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowBigUp, ArrowBigDown, Flag } from "@/components/icons";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type TrailInsightCardProps = {
  insight: TrailInsightPayload;
  problemId: string;
};

export function TrailInsightCard({ insight, problemId }: TrailInsightCardProps) {
  const utils = trpc.useUtils();
  const voteMutation = trpc.trails.vote.useMutation({
    onMutate: async (variables) => {
      await utils.trails.getForProblem.cancel({ problemId });
      const previous = utils.trails.getForProblem.getData({ problemId });
      utils.trails.getForProblem.setData({ problemId }, (data) => {
        if (!data) return data;
        return {
          ...data,
          insights: data.insights.map((entry) =>
            entry.id === variables.insightId
              ? {
                  ...entry,
                  viewerVote: entry.viewerVote === (variables.direction === "UP" ? 1 : -1) ? 0 : variables.direction === "UP" ? 1 : -1,
                  score:
                    entry.score +
                    (entry.viewerVote === (variables.direction === "UP" ? 1 : -1)
                      ? -(variables.direction === "UP" ? 1 : -1)
                      : (variables.direction === "UP" ? 1 : -1) - entry.viewerVote),
                }
              : entry,
          ),
        };
      });
      return { previous };
    },
    onError: (_err, _variables, context) => {
      if (context?.previous) {
        utils.trails.getForProblem.setData({ problemId }, context.previous);
      }
      toast.error("Unable to vote");
    },
    onSettled: () => utils.trails.getForProblem.invalidate({ problemId }),
  });
  const reportMutation = trpc.trails.report.useMutation({
    onSuccess: () => toast.success("Thanks for the report"),
    onError: (error) => toast.error(error.message ?? "Unable to report"),
  });
  const handleVote = (direction: "UP" | "DOWN") => {
    voteMutation.mutate({ insightId: insight.id, direction });
  };
  return (
    <div className={cn("rounded-2xl border p-4", insight.isHidden && "opacity-60")}
    >
      <div className="flex items-center justify-between">
        <Badge variant="outline" className="capitalize">
          {insight.category.toLowerCase()}
        </Badge>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <span>+{insight.score}</span>
          <span>• @{insight.author.handle}</span>
        </div>
      </div>
      <p className="mt-3 text-sm text-foreground">{insight.content}</p>
      <div className="mt-4 flex items-center justify-between">
        <div className="inline-flex items-center gap-1 rounded-full border border-border/60 px-2">
          <Button variant="ghost" size="icon-sm" className={cn(insight.viewerVote === 1 && "text-primary")}
            onClick={() => handleVote("UP")}
          >
            <ArrowBigUp className="h-4 w-4" />
          </Button>
          <span className="text-sm font-semibold">{insight.score}</span>
          <Button variant="ghost" size="icon-sm" className={cn(insight.viewerVote === -1 && "text-destructive")}
            onClick={() => handleVote("DOWN")}
          >
            <ArrowBigDown className="h-4 w-4" />
          </Button>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => reportMutation.mutate({ insightId: insight.id, reason: "MISLEADING" })}
        >
          <Flag className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
