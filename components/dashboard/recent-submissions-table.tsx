"use client";

import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableColumn, DataTableColumnHeader } from "@/components/ui/data-table";
import { cn } from "@/lib/utils";

const VERDICT_COLORS: Record<string, string> = {
  AC: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  MANUAL_ACCEPTED: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  MANUAL_PARTIAL: "bg-amber-500/10 text-amber-600 dark:text-amber-300",
  WA: "bg-rose-500/10 text-rose-600 dark:text-rose-300",
  TLE: "bg-orange-500/10 text-orange-600 dark:text-orange-300",
  MLE: "bg-sky-500/10 text-sky-600 dark:text-sky-300",
  RTE: "bg-purple-500/10 text-purple-600 dark:text-purple-300",
};

export type RecentSubmissionRow = {
  id: string;
  createdAt: string;
  verdictCode: string | null;
  status: string;
  runtimeMs: number | null;
  memoryKb: number | null;
  languageCode: string;
  languageDisplayName: string | null;
  problem: {
    slug: string;
    title: string;
    difficulty?: string | null;
  };
  contest?: {
    slug: string;
    name: string;
  } | null;
};

const columns: DataTableColumn<RecentSubmissionRow>[] = [
  {
    accessorKey: "problem",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Problem" />,
    cell: ({ row }) => {
      const problem = row.original.problem;
      return (
        <div className="space-y-1">
          <Link
            href={`/problems/${problem.slug}`}
            className="text-sm font-medium text-foreground transition hover:text-primary"
          >
            {problem.title}
          </Link>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {problem.difficulty ? (
              <Badge variant="outline" className="text-[10px] uppercase">
                {problem.difficulty?.toLowerCase()}
              </Badge>
            ) : null}
            {row.original.contest ? (
              <span className="inline-flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-primary/60" />
                Contest
              </span>
            ) : null}
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "verdictCode",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Verdict" />,
    cell: ({ row }) => <VerdictBadge verdict={row.original.verdictCode} status={row.original.status} />,
  },
  {
    accessorKey: "runtimeMs",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Runtime" />,
    cell: ({ row }) =>
      row.original.runtimeMs !== null ? (
        <span className="text-sm text-foreground">{row.original.runtimeMs} ms</span>
      ) : (
        <span className="text-sm text-muted-foreground">-</span>
      ),
  },
  {
    accessorKey: "languageCode",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Language" />,
    cell: ({ row }) => (
      <span className="text-sm text-foreground">
        {row.original.languageDisplayName ?? row.original.languageCode.toUpperCase()}
      </span>
    ),
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Submitted" />,
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {formatDistanceToNow(new Date(row.original.createdAt), { addSuffix: true })}
      </span>
    ),
  },
];

export function RecentSubmissionsTable({ data }: { data: RecentSubmissionRow[] }) {
  return (
    <DataTable
      columns={columns}
      data={data}
      enableColumnVisibility={false}
      enablePagination={false}
      emptyMessage="No submissions yet. Try solving a problem!"
    />
  );
}

function VerdictBadge({ verdict, status }: { verdict: string | null; status: string }) {
  if (verdict) {
    const className = VERDICT_COLORS[verdict] ?? "bg-muted text-foreground";
    return (
      <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", className)}>
        {verdict}
      </span>
    );
  }

  return (
    <Badge variant="outline" className="text-xs capitalize">
      {status.replace("_", " ").toLowerCase()}
    </Badge>
  );
}
