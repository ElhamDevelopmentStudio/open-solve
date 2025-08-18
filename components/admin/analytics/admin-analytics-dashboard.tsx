"use client";

import { useMemo } from "react";
import type { inferRouterOutputs } from "@trpc/server";

import { Activity, ArrowUpRight, ShieldAlert, Sparkles } from "@/components/icons";
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui";
import { DataTable, DataTableColumn, DataTableColumnHeader } from "@/components/ui/data-table";
import { adminConfig } from "@/config/admin";
import { trpc } from "@/lib/trpc/client";
import type { AppRouter } from "@/lib/trpc/router";

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
      label: adminConfig.analytics.cards.views,
      value: overview.totals.views.toLocaleString(),
      helper: `${overview.totals.uniqueSessions.toLocaleString()} unique sessions`,
      icon: Activity,
    },
    {
      label: adminConfig.analytics.cards.intent,
      value: percent(overview.totals.solveIntentRate),
      helper: "Clicked Start Solving",
      icon: Sparkles,
    },
    {
      label: adminConfig.analytics.cards.hints,
      value: percent(overview.totals.hintUsageRate),
      helper: "Opened notes or hints",
      icon: ShieldAlert,
    },
    {
      label: adminConfig.analytics.cards.bounce,
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
    <div className="space-y-8 font-mono">
      <div className="flex flex-wrap items-start justify-between gap-3 border-2 border-border bg-background p-6">
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-primary/70">
            {adminConfig.analytics.marker}
          </p>
          <h1 className="text-4xl font-black tracking-tight">
            {adminConfig.analytics.headline.line1}
            <br />
            {adminConfig.analytics.headline.line2}
            <br />
            <span className="bg-gradient-to-r from-primary via-primary to-primary/70 bg-clip-text text-transparent">
              {adminConfig.analytics.headline.line3}
            </span>
          </h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            {adminConfig.analytics.description} Window: last {Math.round(overview.windowHours / 24)}{" "}
            days.
          </p>
        </div>
        <Badge className="rounded-none border-2 border-border bg-background px-3 py-1 text-[10px] font-bold uppercase text-primary">
          {adminConfig.analytics.cards.live}
        </Badge>
      </div>

      <div className="grid gap-px bg-border/40 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card
              key={card.label}
              className="border-2 border-border bg-background p-0 shadow-none transition-colors hover:border-primary/50 hover:bg-accent"
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      {card.label}
                    </p>
                    <p className="mt-2 text-2xl font-semibold">{card.value}</p>
                    <p className="text-xs text-muted-foreground">{card.helper}</p>
                  </div>
                  <span className="border-2 border-border bg-primary/10 p-3 text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-px bg-border/40 lg:grid-cols-3">
        <Card className="border-2 border-border bg-background lg:col-span-2">
          <CardHeader className="border-b-2 border-border">
            <CardTitle className="text-lg font-black">
              {adminConfig.analytics.devices.title}
            </CardTitle>
            <CardDescription>{adminConfig.analytics.devices.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {overview.devices.length === 0 ? (
              <p className="text-sm text-muted-foreground">{adminConfig.analytics.devices.empty}</p>
            ) : (
              overview.devices.map((device) => (
                <div key={device.deviceType} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <p className="capitalize">{device.deviceType}</p>
                    <p className="text-xs text-muted-foreground">
                      {percent(device.count / deviceTotal)}
                    </p>
                  </div>
                  <div className="h-2 bg-muted">
                    <div
                      className="h-2 bg-primary"
                      style={{ width: `${(device.count / deviceTotal) * 100}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card className="border-2 border-border bg-background">
          <CardHeader className="border-b-2 border-border">
            <CardTitle className="text-lg font-black">
              {adminConfig.analytics.quality.title}
            </CardTitle>
            <CardDescription>{adminConfig.analytics.quality.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between border-2 border-border px-3 py-2">
              <div>
                <p className="text-sm font-medium">{adminConfig.analytics.quality.tti}</p>
                <p className="text-xs text-muted-foreground">
                  {durationLabel(overview.totals.avgTimeToFirstInteractionMs)}
                </p>
              </div>
              <Badge
                variant="secondary"
                className="rounded-none border-2 border-border text-[11px]"
              >
                {overview.totals.avgTimeToFirstInteractionMs
                  ? adminConfig.analytics.quality.healthy
                  : adminConfig.analytics.quality.collecting}
              </Badge>
            </div>
            <TooltipProvider>
              <div className="space-y-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center justify-between border-2 border-border px-3 py-2">
                      <div>
                        <p className="text-sm font-medium">
                          {adminConfig.analytics.quality.client}
                        </p>
                        <p className="text-xs text-muted-foreground">UI exceptions</p>
                      </div>
                      <Badge variant="destructive">{overview.errorCounts.clientErrors}</Badge>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="rounded-none border-2 border-border bg-background font-mono text-xs text-foreground">
                    Captured via client.error events
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center justify-between border-2 border-border px-3 py-2">
                      <div>
                        <p className="text-sm font-medium">
                          {adminConfig.analytics.quality.network}
                        </p>
                        <p className="text-xs text-muted-foreground">tRPC and beacon errors</p>
                      </div>
                      <Badge variant="outline" className="text-destructive">
                        {overview.errorCounts.networkErrors}
                      </Badge>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="rounded-none border-2 border-border bg-background font-mono text-xs text-foreground">
                    Failed `network.request_failed` events
                  </TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
          </CardContent>
        </Card>
      </div>

      <Card className="border-2 border-border bg-background">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-lg font-black">
              {adminConfig.analytics.table.title}
            </CardTitle>
            <CardDescription>{adminConfig.analytics.table.description}</CardDescription>
          </div>
          <Badge className="rounded-none border-2 border-border px-3 py-1 text-[10px] font-bold uppercase">
            {problems.length} {adminConfig.analytics.table.tracked}
          </Badge>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={problems} />
        </CardContent>
      </Card>
    </div>
  );
}
