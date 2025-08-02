"use client";

import { TrailInsightCard } from "@/components/trails/trail-insight-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc/client";
import type { TrailInsightCategory } from "@prisma/client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type TrailsBoardProps = {
  problemId: string;
};

const categories: Array<{ value: TrailInsightCategory; label: string }> = [
  { value: "IDEA", label: "Idea" },
  { value: "PATTERN", label: "Pattern" },
  { value: "DATA_STRUCTURE", label: "Data structure" },
  { value: "PITFALL", label: "Pitfall" },
];

export function TrailsBoard({ problemId }: TrailsBoardProps) {
  const trailsQuery = trpc.trails.getForProblem.useQuery({ problemId });
  const sessionQuery = trpc.auth.getSession.useQuery(undefined, { staleTime: 30_000 });
  const canContribute = Boolean(sessionQuery.data?.user);
  const utils = trpc.useUtils();
  const addMutation = trpc.trails.addInsight.useMutation({
    onSuccess: () => {
      toast.success("Insight published");
      setContent("");
      utils.trails.getForProblem.invalidate({ problemId });
    },
    onError: (error) => toast.error(error.message ?? "Unable to add insight"),
  });
  const [category, setCategory] = useState<TrailInsightCategory>("IDEA");
  const [content, setContent] = useState("");
  const [connectFrom, setConnectFrom] = useState<string[]>([]);

  const edges = useMemo(() => trailsQuery.data?.edges ?? [], [trailsQuery.data?.edges]);
  const insights = useMemo(() => trailsQuery.data?.insights ?? [], [trailsQuery.data?.insights]);
  const topInsights = useMemo(() => insights.slice(0, 6), [insights]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!content.trim()) return;
    addMutation.mutate({
      problemId,
      content: content.trim(),
      category,
      connectFrom,
    });
  };

  return (
    <div className="space-y-6">
      <section className="border border-border/70 bg-card/80 p-6">
        {canContribute ? (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="trail-content">What insight helped?</Label>
                <Input
                  id="trail-content"
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  placeholder="e.g. Try binary searching on answer"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={category}
                  onValueChange={(value) => setCategory(value as TrailInsightCategory)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Connect after</Label>
              <div className="grid gap-2 md:grid-cols-2">
                {topInsights.map((insight) => (
                  <label
                    key={insight.id}
                    className="flex cursor-pointer items-start gap-2 rounded-2xl border border-border/40 bg-muted/10 p-3 text-sm"
                  >
                    <Checkbox
                      checked={connectFrom.includes(insight.id)}
                      onCheckedChange={() =>
                        setConnectFrom((prev) =>
                          prev.includes(insight.id)
                            ? prev.filter((id) => id !== insight.id)
                            : [...prev, insight.id],
                        )
                      }
                    />
                    <span>{insight.content}</span>
                  </label>
                ))}
                {topInsights.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No insights yet.</p>
                ) : null}
              </div>
            </div>
            <Button type="submit" disabled={addMutation.isPending}>
              {addMutation.isPending ? "Saving…" : "Add insight"}
            </Button>
          </form>
        ) : (
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>Sign in to publish new trail insights.</p>
            <Button asChild size="sm">
              <Link href="/sign-in">Sign in</Link>
            </Button>
          </div>
        )}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase text-muted-foreground">Insight stream</h3>
          {insights.length === 0 ? (
            <p className="border border-dashed border-border/60 p-6 text-sm text-muted-foreground">
              Nothing yet. Share your first insight!
            </p>
          ) : (
            <div className="space-y-3">
              {insights.map((insight) => (
                <TrailInsightCard key={insight.id} insight={insight} problemId={problemId} />
              ))}
            </div>
          )}
        </div>
        <div className="space-y-3 border border-border/70 bg-card/70 p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase text-muted-foreground">
              Common next steps
            </h3>
            <Badge variant="secondary">Graph</Badge>
          </div>
          {edges.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              We’ll chart relationships as more insights are added.
            </p>
          ) : (
            <div className="space-y-2">
              {edges.map((edge) => {
                const from = insights.find((insight) => insight.id === edge.fromInsightId);
                const to = insights.find((insight) => insight.id === edge.toInsightId);
                if (!from || !to) return null;
                return (
                  <div
                    key={edge.id}
                    className="rounded-2xl border border-border/50 bg-background/80 p-3 text-sm"
                  >
                    <p className="font-medium text-foreground">{from.content}</p>
                    <p className="mt-2 text-xs uppercase text-muted-foreground">leads to</p>
                    <p className="font-medium text-primary">{to.content}</p>
                    <p className="text-xs text-muted-foreground">Seen {edge.weight} times</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
