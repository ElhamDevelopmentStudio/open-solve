"use client";

import Link from "next/link";
import { useMemo, useState, type ComponentType, type SVGProps } from "react";
import { formatDistanceToNow } from "date-fns";
import type { inferRouterOutputs } from "@trpc/server";
import { ProblemProposalStatus } from "@prisma/client";
import {
  ClipboardIcon,
  FilterIcon,
  Shield01Icon,
  SparklesIcon,
} from "hugeicons-react";

import type { AppRouter } from "@/lib/trpc/router";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DataTable,
  type DataTableColumn,
  DataTableColumnHeader,
} from "@/components/ui/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type ProposalRow = RouterOutputs["proposals"]["staffList"][number];

const STATUSES = Object.values(ProblemProposalStatus) as ProblemProposalStatus[];

const statusStyles: Record<ProblemProposalStatus, string> = {
  SUBMITTED: "bg-blue-500/10 text-blue-600 dark:text-blue-300",
  PRESCREEN: "bg-amber-500/10 text-amber-600 dark:text-amber-300",
  IN_REVIEW: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-300",
  ACCEPTED: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  CHANGES_REQUESTED: "bg-amber-500/10 text-amber-600 dark:text-amber-300",
  REJECTED: "bg-rose-500/10 text-rose-600 dark:text-rose-300",
};

export function StaffProposalsDashboard() {
  const [statusFilter, setStatusFilter] = useState<ProblemProposalStatus | "ALL">("ALL");
  const filters = statusFilter === "ALL" ? undefined : { status: statusFilter };
  const proposalsQuery = trpc.proposals.staffList.useQuery(filters);
  const proposals = proposalsQuery.data ?? [];
  const metrics = useMemo(() => buildProposalMetrics(proposals), [proposals]);
  const columns = useProposalColumns();

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase text-muted-foreground">Community pipeline</p>
          <h1 className="text-3xl font-semibold tracking-tight">Proposal review</h1>
          <p className="text-sm text-muted-foreground">
            Triage incoming problems, coach authors, and graduate ideas into the official problem bank.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/docs/proposals">Review guidelines</Link>
          </Button>
          <Button asChild>
            <Link href="/staff/problems">Create draft</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pipeline health</CardTitle>
          <CardDescription>High-level insight across every proposal state.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          {metrics.map((metric) => (
            <div key={metric.label} className="rounded-2xl border bg-muted/40 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{metric.label}</p>
                <metric.icon className={cn("h-5 w-5", metric.tone)} />
              </div>
              <p className="mt-3 text-2xl font-semibold">{metric.value}</p>
              <p className="text-xs text-muted-foreground">{metric.meta}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Incoming proposals</CardTitle>
              <CardDescription>
                Filter by workflow stage, search titles, and jump into detail review.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All statuses</SelectItem>
                  {STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status.replace("_", " ").toLowerCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Badge variant="outline" className="gap-1 text-xs">
                <FilterIcon className="h-3.5 w-3.5" />
                {statusFilter === "ALL" ? "No filter" : statusFilter.toLowerCase()}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {proposalsQuery.isLoading ? (
            <Skeleton className="h-64 w-full rounded-2xl" />
          ) : proposalsQuery.isError ? (
            <Alert variant="destructive">
              <AlertTitle>Unable to load proposals</AlertTitle>
              <AlertDescription>
                {proposalsQuery.error?.message ?? "Please refresh and try again."}
              </AlertDescription>
            </Alert>
          ) : (
            <DataTable
              columns={columns}
              data={proposals}
              searchKey="title"
              searchPlaceholder="Search titles or author handles…"
              emptyMessage="No proposals match this view."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function useProposalColumns(): DataTableColumn<ProposalRow>[] {
  return useMemo<DataTableColumn<ProposalRow>[]>(
    () => [
      {
        accessorKey: "title",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Proposal" />,
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.title}</p>
            <p className="text-xs text-muted-foreground">{row.original.intendedDifficulty}</p>
          </div>
        ),
      },
      {
        accessorKey: "author",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Author" />,
        cell: ({ row }) => (
          <div className="text-sm">
            {row.original.author.handle ?? row.original.author.name ?? "Unknown"}
          </div>
        ),
      },
      {
        accessorKey: "reviewer",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Reviewer" />,
        cell: ({ row }) => (
          <div className="text-sm">
            {row.original.reviewer
              ? row.original.reviewer.handle ?? row.original.reviewer.name
              : "Unassigned"}
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
        cell: ({ row }) => (
          <Badge className={cn("capitalize", statusStyles[row.original.status])}>
            {row.original.status.replace("_", " ").toLowerCase()}
          </Badge>
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
      {
        id: "actions",
        header: "",
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => (
          <Button asChild variant="ghost" size="sm">
            <Link href={`/staff/proposals/${row.original.id}`}>Review</Link>
          </Button>
        ),
      },
    ],
    [],
  );
}

type ProposalMetric = {
  label: string;
  value: string;
  meta: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  tone: string;
};

function buildProposalMetrics(proposals: ProposalRow[]): ProposalMetric[] {
  const awaitingPrescreen = proposals.filter((proposal) => proposal.status === "SUBMITTED").length;
  const inReview = proposals.filter((proposal) => proposal.status === "IN_REVIEW").length;
  const accepted = proposals.filter((proposal) => proposal.status === "ACCEPTED").length;

  return [
    {
      label: "Awaiting triage",
      value: awaitingPrescreen.toString(),
      meta: "Need prescreen before sharing feedback",
      icon: ClipboardIcon,
      tone: "text-blue-600 dark:text-blue-300",
    },
    {
      label: "Actively reviewed",
      value: inReview.toString(),
      meta: "Assigned to curators right now",
      icon: Shield01Icon,
      tone: "text-indigo-500 dark:text-indigo-300",
    },
    {
      label: "Accepted this week",
      value: accepted.toString(),
      meta: "Ready to convert into drafts",
      icon: SparklesIcon,
      tone: "text-emerald-500 dark:text-emerald-300",
    },
  ];
}
