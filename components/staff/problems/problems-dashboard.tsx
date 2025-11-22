"use client";

import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "@/components/icons";
import { formatDistanceToNow } from "date-fns";
import { staffConfig } from "@/config/staff";

export function StaffProblemsDashboard() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.staff.problems.list.useQuery(undefined);
  const createProblem = trpc.staff.problems.create.useMutation({
    onSuccess: (problem) => {
      utils.staff.problems.list.invalidate();
      router.push(`/staff/problems/${problem.id}`);
    },
  });

  const totalCount = data?.length ?? 0;
  const draftCount = data?.filter((problem) => problem.state === "DRAFT").length ?? 0;
  const reviewCount = data?.filter((problem) => problem.state === "REVIEW").length ?? 0;
  const publishedCount = data?.filter((problem) => problem.state === "PUBLISHED").length ?? 0;
  const metricValueByKey: Record<string, number> = {
    total: totalCount,
    draft: draftCount,
    review: reviewCount,
    published: publishedCount,
  };

  return (
    <div className="space-y-8 font-mono text-foreground">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-primary/70">
            {staffConfig.problems.list.marker}
          </p>
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
            {staffConfig.problems.list.title}
          </h1>
        </div>
        <Button
          onClick={() => createProblem.mutate({ title: "Untitled Problem" })}
          disabled={createProblem.isPending}
          className="h-12 border-2 border-primary bg-primary px-6 text-xs font-bold uppercase text-primary-foreground shadow-md shadow-primary/20 transition-all hover:shadow-lg hover:shadow-primary/30"
        >
          {createProblem.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Plus className="mr-2 h-4 w-4" />
          )}
          {createProblem.isPending
            ? staffConfig.problems.list.actions.creating
            : staffConfig.problems.list.actions.newDraft}
        </Button>
      </div>

      <div className="grid gap-px bg-border/50 sm:grid-cols-2 lg:grid-cols-4">
        {staffConfig.problems.list.metrics.map((metric) => (
          <div key={metric.key} className="bg-card p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary/80">
              {metric.title}
            </p>
            <p className="text-2xl font-black">{metricValueByKey[metric.key] ?? 0}</p>
            <p className="text-xs text-muted-foreground">{metric.description}</p>
          </div>
        ))}
      </div>

      <Card className="border-2 border-border bg-background shadow-sm shadow-primary/10">
        <CardHeader className="border-b-2 border-border">
          <CardTitle className="text-xl font-black">{staffConfig.problems.list.title}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading drafts…</p>
          ) : data && data.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{staffConfig.problems.list.columns.title}</TableHead>
                  <TableHead>{staffConfig.problems.list.columns.state}</TableHead>
                  <TableHead>{staffConfig.problems.list.columns.author}</TableHead>
                  <TableHead>{staffConfig.problems.list.columns.updated}</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((problem) => (
                  <TableRow key={problem.id} className="transition-colors hover:border-primary/40">
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-bold uppercase tracking-tight">{problem.slug}</p>
                        <p className="text-xs text-muted-foreground">
                          {problem.difficulty?.code ?? "Unrated"}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-2 uppercase">
                        {problem.state.toLowerCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{problem.author?.handle ?? "Unknown"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(problem.updatedAt), { addSuffix: true })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/staff/problems/${problem.id}`)}
                        className="border-2 border-border px-3 text-[11px] font-bold uppercase hover:border-primary/50"
                      >
                        {staffConfig.problems.list.actions.open}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <p className="text-sm text-muted-foreground">{staffConfig.problems.list.empty}</p>
              <Button
                variant="outline"
                onClick={() => createProblem.mutate({ title: "Untitled Problem" })}
                disabled={createProblem.isPending}
              >
                <Plus className="mr-2 h-4 w-4" />
                {staffConfig.problems.list.actions.newDraft}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
