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
import { Loader2, Plus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export function StaffProblemsDashboard() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.staff.problems.list.useQuery({ state: undefined });
  const createProblem = trpc.staff.problems.create.useMutation({
    onSuccess: (problem) => {
      utils.staff.problems.list.invalidate();
      router.push(`/staff/problems/${problem.id}`);
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase text-muted-foreground">Workspace</p>
          <h1 className="text-2xl font-semibold">Draft Problems</h1>
        </div>
        <Button
          onClick={() => createProblem.mutate({ title: "Untitled Problem" })}
          disabled={createProblem.isPending}
        >
          {createProblem.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Plus className="mr-2 h-4 w-4" />
          )}{" "}
          New draft
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Draft queue</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading drafts…</p>
          ) : data && data.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead>Author</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((problem) => (
                  <TableRow key={problem.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{problem.slug}</p>
                        <p className="text-xs text-muted-foreground">
                          {problem.difficulty?.code ?? "Unrated"}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{problem.state.toLowerCase()}</Badge>
                    </TableCell>
                    <TableCell>{problem.author?.handle ?? "Unknown"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(problem.updatedAt), { addSuffix: true })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/staff/problems/${problem.id}`)}
                      >
                        Open
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">No drafts yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
