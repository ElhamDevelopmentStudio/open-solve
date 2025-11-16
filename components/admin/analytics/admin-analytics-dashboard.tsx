"use client";

import { Activity, ArrowUpRight, ShieldAlert, Sparkles } from "@/components/icons";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui";
import {
  DataTable,
  DataTableColumn,
  DataTableColumnHeader,
} from "@/components/ui/data-table";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import type { AppRouter } from "@/lib/trpc/router";
import type { inferRouterOutputs } from "@trpc/server";
import { useMemo } from "react";

type Overview = inferRouterOutputs<AppRouter>["admin"]["analytics"]["overview"];
type ProblemRow = inferRouterOutputs<AppRouter>["admin"]["analytics"]["problems"][number];

const percent = (value: number) => `${(value * 100).toFixed(1)}%`;
const durationLabel = (ms: number | null) =>
  typeof ms === "number" ? `${(ms / 1000).toFixed(1)}s` : "—";

export function AdminAnalyticsDashboard({
  initialOverview,
  initialProblems,
}: {
  initialOverview: Overview;
  initialProblems: ProblemRow[];
}) {
  const overviewQuery = trpc.admin.analytics.overview.useQuery(undefined, {
    initialData: initialOverview,
    refetchInterval: 60_000,
  });
  const problemsQuery = trpc.admin.analytics.problems.useQuery(undefined, {
    initialData: initialProblems,
    refetchInterval: 90_000,
  });

  const overview = overviewQuery.data ?? initialOverview;
  const problems = problemsQuery.data ?? initialProblems;
  const cards = [
    {
      label: "Problem views",
      value: overview.totals.views.toLocaleString(),
      helper: `${overview.totals.uniqueSessions.toLocaleString()} unique sessions`,
      icon: Activity,
    },
    {
      label: "Solve intent",
      value: percent(overview.totals.solveIntentRate),
      helper: "Clicked Start Solving",
      icon: Sparkles,
    },
    {
      label: "Hint usage",
      value: percent(overview.totals.hintUsageRate),
      helper: "Opened notes or hints",
      icon: ShieldAlert,
    },
    {
      label: "Bounce rate",
      value: percent(overview.totals.bounceRate),
      helper: "Exited before interacting",
      icon: ArrowUpRight,
    },
  ];

  const columns = useMemo<DataTableColumn<ProblemRow>[]>(
    () => [
      {
        accessorKey: "title",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Problem" />,
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.title}</p>
            <p className="text-xs text-muted-foreground">/{row.original.slug}</p>
          </div>
        ),
      },
      {
        accessorKey: "difficulty",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Difficulty" />,
        cell: ({ row }) => (
          <Badge variant="outline" className="uppercase text-[11px]">
            {row.original.difficulty ?? "—"}
          </Badge>
        ),
      },
      {
        accessorKey: "views",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Views" />,
        cell: ({ row }) => row.original.views.toLocaleString(),
      },
      {
        accessorKey: "solveIntentRate",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Solve intent" />,
        cell: ({ row }) => percent(row.original.solveIntentRate),
      },
      {
        accessorKey: "hintUsageRate",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Hints" />,
        cell: ({ row }) => percent(row.original.hintUsageRate),
      },
      {
        accessorKey: "medianTimeToAcMs",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Median TTA" />,
        cell: ({ row }) => durationLabel(row.original.medianTimeToAcMs),
      },
      {
        accessorKey: "stuckRate",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Stuck rate" />,
        cell: ({ row }) => percent(row.original.stuckRate),
      },
    ],
    [],
  );

  const deviceTotal = overview.devices.reduce((sum, device) => sum + device.count, 0) || 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase text-muted-foreground tracking-[0.3em]">
            Experience telemetry
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">User interaction analytics</h1>
          <p className="text-sm text-muted-foreground">
            Window: last {Math.round(overview.windowHours / 24)} days
          </p>
        </div>
        <Badge variant="outline" className="border-primary/30 text-primary">
          Live refresh
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label} className="border-border/60 bg-card/80">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      {card.label}
                    </p>
                    <p className="mt-2 text-2xl font-semibold">{card.value}</p>
                    <p className="text-xs text-muted-foreground">{card.helper}</p>
                  </div>
                  <span className="rounded-xl bg-primary/10 p-3 text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-border/60 bg-card/80 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Device mix</CardTitle>
            <CardDescription>Sessions per device type</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {overview.devices.length === 0 ? (
              <p className="text-sm text-muted-foreground">No device data yet.</p>
            ) : (
              overview.devices.map((device) => (
                <div key={device.deviceType} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <p className="capitalize">{device.deviceType}</p>
                    <p className="text-xs text-muted-foreground">
                      {percent(device.count / deviceTotal)}
                    </p>
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-primary"
                      style={{ width: `${(device.count / deviceTotal) * 100}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-card/80">
          <CardHeader>
            <CardTitle className="text-base">Quality signals</CardTitle>
            <CardDescription>Realtime error and stuck signals</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-2xl border border-border/60 px-3 py-2">
              <div>
                <p className="text-sm font-medium">Average time to interact</p>
                <p className="text-xs text-muted-foreground">
                  {durationLabel(overview.totals.avgTimeToFirstInteractionMs)}
                </p>
              </div>
              <Badge variant="secondary" className="text-[11px]">
                {overview.totals.avgTimeToFirstInteractionMs ? "healthy" : "collecting"}
              </Badge>
            </div>
            <TooltipProvider>
              <div className="space-y-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center justify-between rounded-2xl border border-border/60 px-3 py-2">
                      <div>
                        <p className="text-sm font-medium">Client errors</p>
                        <p className="text-xs text-muted-foreground">UI exceptions</p>
                      </div>
                      <Badge variant="destructive">{overview.errorCounts.clientErrors}</Badge>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>Captured via client.error events</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center justify-between rounded-2xl border border-border/60 px-3 py-2">
                      <div>
                        <p className="text-sm font-medium">Network failures</p>
                        <p className="text-xs text-muted-foreground">tRPC and beacon errors</p>
                      </div>
                      <Badge variant="outline" className="text-destructive">
                        {overview.errorCounts.networkErrors}
                      </Badge>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>Failed `network.request_failed` events</TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/60 bg-card/80">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base">Top problem insights</CardTitle>
            <CardDescription>Pages with highest view volume in this window</CardDescription>
          </div>
          <Badge variant="secondary" className="text-[11px]">
            {problems.length} tracked
          </Badge>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={problems} />
        </CardContent>
      </Card>
    </div>
  );
}
