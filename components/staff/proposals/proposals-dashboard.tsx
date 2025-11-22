"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import type { inferRouterOutputs } from "@trpc/server";
import { ProblemProposalStatus } from "@prisma/client";

import { ClipboardList, Filter, Shield, Sparkles, type IconComponent } from "@/components/icons";
import type { AppRouter } from "@/lib/trpc/router";
import { trpc } from "@/lib/trpc/client";
import { staffConfig } from "@/config/staff";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type DataTableColumn, DataTableColumnHeader } from "@/components/ui/data-table";
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

export function StaffProposalsDashboard() {
  const [statusFilter, setStatusFilter] = useState<ProblemProposalStatus | "ALL">("ALL");
  const filters = statusFilter === "ALL" ? undefined : { status: statusFilter };
  const proposalsQuery = trpc.proposals.staffList.useQuery(filters);
  const proposals = useMemo(() => proposalsQuery.data ?? [], [proposalsQuery.data]);
  const metrics = useMemo(() => buildProposalMetrics(proposals), [proposals]);
  const columns = useProposalColumns();

  return (
    <div className="space-y-8 font-mono text-foreground">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary/70">
            {staffConfig.proposals.list.marker}
          </p>
          <h2 className="text-3xl font-black tracking-tight sm:text-4xl">
            {staffConfig.proposals.list.title}
          </h2>
          <p className="text-sm text-muted-foreground">{staffConfig.proposals.list.description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" asChild className="border-2 border-border">
            <Link href="/docs/proposals">{staffConfig.proposals.list.actions.guidelines}</Link>
          </Button>
          <Button asChild className="border-2 border-primary px-5 text-xs font-bold uppercase">
            <Link href="/staff/problems">{staffConfig.proposals.list.actions.createDraft}</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-px bg-border/50 md:grid-cols-3">
        {metrics.map((metric) => (
          <div key={metric.label} className="bg-card p-4">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/80">
                {metric.label}
              </p>
              <metric.icon className="h-5 w-5 text-primary" />
            </div>
            <p className="mt-2 text-3xl font-black">{metric.value}</p>
            <p className="text-xs text-muted-foreground">{metric.meta}</p>
          </div>
        ))}
      </div>

      <Card className="border-2 border-border shadow-sm shadow-primary/10">
        <CardHeader className="gap-4 border-b-2 border-border">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-xl font-black">Incoming proposals</CardTitle>
              <CardDescription>
                Filter by workflow stage, search titles, and jump into detail review.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}
              >
                <SelectTrigger className="w-[200px] rounded-none border-2 border-border">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent className="rounded-none border-2 border-border">
                  <SelectItem value="ALL">All statuses</SelectItem>
                  {STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status.replace("_", " ").toLowerCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Badge variant="outline" className="gap-1 text-xs">
                <Filter className="h-3.5 w-3.5" />
                {statusFilter === "ALL" ? "No filter" : statusFilter.toLowerCase()}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {proposalsQuery.isLoading ? (
            <Skeleton className="h-64 w-full" />
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
              searchPlaceholder={staffConfig.proposals.list.searchPlaceholder}
              emptyMessage={staffConfig.proposals.list.empty}
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
              ? (row.original.reviewer.handle ?? row.original.reviewer.name)
              : "Unassigned"}
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
        cell: ({ row }) => (
          <Badge variant={statusVariants[row.original.status]} className="capitalize">
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
  icon: IconComponent;
};

function buildProposalMetrics(proposals: ProposalRow[]): ProposalMetric[] {
  const awaitingPrescreen = proposals.filter((proposal) => proposal.status === "SUBMITTED").length;
  const inReview = proposals.filter((proposal) => proposal.status === "IN_REVIEW").length;
  const accepted = proposals.filter((proposal) => proposal.status === "ACCEPTED").length;

  const metricValues: Record<string, number> = {
    submitted: awaitingPrescreen,
    inReview,
    accepted,
  };
  const icons: Record<string, IconComponent> = {
    submitted: ClipboardList,
    inReview: Shield,
    accepted: Sparkles,
  };

  return staffConfig.proposals.list.metrics.map((metric) => ({
    label: metric.title,
    value: (metricValues[metric.key] ?? 0).toString(),
    meta: metric.meta,
    icon: icons[metric.key] ?? ClipboardList,
  }));
}
