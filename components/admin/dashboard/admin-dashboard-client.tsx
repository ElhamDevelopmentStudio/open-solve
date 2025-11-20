"use client";

import { formatDistanceToNow } from "date-fns";
import type { inferRouterOutputs } from "@trpc/server";

import { Activity, Braces, Cog, RefreshCw, ShieldAlert, Users2 } from "@/components/icons";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { adminConfig } from "@/config/admin";
import { trpc } from "@/lib/trpc/client";
import type { AppRouter } from "@/lib/trpc/router";
import { cn } from "@/lib/utils";

type Overview = inferRouterOutputs<AppRouter>["admin"]["dashboard"]["overview"];

export function AdminDashboardClient({ initialData }: { initialData: Overview }) {
  const overviewQuery = trpc.admin.dashboard.overview.useQuery(undefined, {
    initialData,
    refetchInterval: 30_000,
  });
  const data = overviewQuery.data ?? initialData;

  const stats = [
    {
      label: adminConfig.overview.stats.users,
      value: data.users.total.toLocaleString(),
      helper: `+${data.users.newLast24h.toLocaleString()} in 24h`,
      icon: Users2,
    },
    {
      label: adminConfig.overview.stats.submissions,
      value: data.submissions.last24h.toLocaleString(),
      helper: `${Math.round(data.submissions.acceptanceRateLast24h * 100)}% accepted`,
      icon: Activity,
    },
    {
      label: adminConfig.overview.stats.problems,
      value: data.problems.total.toLocaleString(),
      helper: `${data.problems.byState.PUBLISHED ?? 0} published`,
      icon: Braces,
    },
    {
      label: adminConfig.overview.stats.features,
      value: data.featureFlags.total.toLocaleString(),
      helper: `${data.featureFlags.enabled} active`,
      icon: Cog,
    },
  ];

  return (
    <div className="space-y-8 font-mono">
      <div className="flex flex-col gap-4 border-2 border-border bg-background p-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-primary/70">
            {adminConfig.overview.sections.telemetry.title}
          </p>
          <p className="text-sm text-muted-foreground">
            {adminConfig.overview.sections.telemetry.description}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => overviewQuery.refetch()}
          disabled={overviewQuery.isFetching}
          className="h-10 gap-2 rounded-none border-2 border-border px-4 font-bold uppercase"
        >
          <RefreshCw className={cn("h-4 w-4", overviewQuery.isFetching && "animate-spin")} />
          {adminConfig.overview.sections.telemetry.refresh}
        </Button>
      </div>

      <div className="grid gap-px bg-border/40 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.label}
              className="border-2 border-border bg-background p-0 shadow-none transition-colors hover:border-primary/50 hover:bg-accent"
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">{stat.label}</p>
                    <p className="mt-2 text-2xl font-semibold">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.helper}</p>
                  </div>
                  <span className="border-2 border-border bg-primary/10 p-3 text-primary">
                    <Icon className="h-4 w-4" />
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
              {adminConfig.overview.sections.queues.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <QueueBar
              label={adminConfig.overview.sections.queues.queued}
              value={data.submissions.queued}
              tone="primary"
            />
            <QueueBar
              label={adminConfig.overview.sections.queues.running}
              value={data.submissions.running}
              tone="muted"
            />
            <QueueBar
              label={adminConfig.overview.sections.queues.manual}
              value={data.submissions.manualPending}
              tone="warning"
            />
          </CardContent>
        </Card>
        <Card className="border-2 border-border bg-background">
          <CardHeader className="border-b-2 border-border">
            <CardTitle className="text-lg font-black">
              {adminConfig.overview.sections.system.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(data.systemHealth).map(([service, status]) => (
              <div
                key={service}
                className="flex items-center justify-between border-2 border-border px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium capitalize">{service}</p>
                  <p className="text-xs text-muted-foreground">
                    {status.latencyMs ? `${status.latencyMs} ms` : "n/a"}
                  </p>
                </div>
                <Badge
                  variant={status.healthy ? "outline" : "destructive"}
                  className={cn(
                    "rounded-none border-2 px-2 py-1 text-[11px] font-bold uppercase",
                    status.healthy
                      ? "border-primary/40 text-primary"
                      : "border-destructive/40 text-destructive-foreground",
                  )}
                >
                  {status.healthy
                    ? adminConfig.overview.sections.system.healthy
                    : adminConfig.overview.sections.system.degraded}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-px bg-border/40 lg:grid-cols-2">
        <Card className="border-2 border-border bg-background">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-black">
                {adminConfig.overview.sections.incidents.title}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {data.incidents.length > 0 ? "Active investigations" : "All clear"}
              </p>
            </div>
            <Badge variant="secondary" className="rounded-none border-2 border-border text-[11px]">
              {data.incidents.length}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.incidents.length === 0 ? (
              <div className="border-2 border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                {adminConfig.overview.sections.incidents.empty}
              </div>
            ) : (
              data.incidents.map((incident) => (
                <div key={incident.id} className="border-2 border-border p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-bold uppercase">{incident.title}</p>
                      <p className="text-xs text-muted-foreground">{incident.summary}</p>
                    </div>
                    <Badge
                      variant="outline"
                      className="rounded-none border-2 border-border px-2 py-1 text-[10px] font-bold uppercase"
                    >
                      {incident.severity}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(incident.startedAt), { addSuffix: true })}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-2 border-border bg-background">
          <CardHeader className="border-b-2 border-border">
            <CardTitle className="text-lg font-black">
              {adminConfig.overview.sections.audit.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.auditLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between border-2 border-border px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium">{log.action}</p>
                  <p className="text-xs text-muted-foreground">
                    {log.user?.handle ?? "system"} •{" "}
                    {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                  </p>
                </div>
                <ShieldAlert className="h-4 w-4 text-muted-foreground" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function QueueBar({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "primary" | "muted" | "warning";
}) {
  const colors: Record<"primary" | "muted" | "warning", string> = {
    primary: "bg-primary/70",
    muted: "bg-muted-foreground/60",
    warning: "bg-warning/70 text-background",
  };
  return (
    <div>
      <div className="flex items-center justify-between text-sm font-medium">
        <span>{label}</span>
        <span>{value.toLocaleString()}</span>
      </div>
      <div className="mt-2 h-2 bg-muted">
        <div
          className={cn("h-full transition-all", colors[tone])}
          style={{ width: `${Math.min(100, value)}%` }}
        />
      </div>
    </div>
  );
}
