"use client";

import { trpc } from "@/lib/trpc/client";
import type { AppRouter } from "@/lib/trpc/router";
import type { inferRouterOutputs } from "@trpc/server";
import { Activity, Cog, ShieldAlert, Users2, Braces, RefreshCw } from "@/components/icons";
import { formatDistanceToNow } from "date-fns";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
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
      label: "Total users",
      value: data.users.total.toLocaleString(),
      helper: `+${data.users.newLast24h.toLocaleString()} in 24h`,
      icon: Users2,
    },
    {
      label: "Submissions (24h)",
      value: data.submissions.last24h.toLocaleString(),
      helper: `${Math.round(data.submissions.acceptanceRateLast24h * 100)}% accepted`,
      icon: Activity,
    },
    {
      label: "Problems",
      value: data.problems.total.toLocaleString(),
      helper: `${data.problems.byState.PUBLISHED ?? 0} published`,
      icon: Braces,
    },
    {
      label: "Feature flags",
      value: data.featureFlags.total.toLocaleString(),
      helper: `${data.featureFlags.enabled} active`,
      icon: Cog,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Realtime telemetry</h2>
          <p className="text-sm text-muted-foreground">
            Everything critical for users, problems, submissions, and infrastructure health.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => overviewQuery.refetch()}
          disabled={overviewQuery.isFetching}
          className="gap-2"
        >
          <RefreshCw className={cn("h-4 w-4", overviewQuery.isFetching && "animate-spin")} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="border-border/60 bg-card/80">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">{stat.label}</p>
                    <p className="mt-2 text-2xl font-semibold">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.helper}</p>
                  </div>
                  <span className="rounded-xl bg-primary/10 p-3 text-primary">
                    <Icon className="h-4 w-4" />
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
            <CardTitle className="text-base">Judge queues</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <QueueBar label="Queued" value={data.submissions.queued} tone="primary" />
            <QueueBar label="Running" value={data.submissions.running} tone="muted" />
            <QueueBar
              label="Manual review"
              value={data.submissions.manualPending}
              tone="warning"
            />
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-card/80">
          <CardHeader>
            <CardTitle className="text-base">System health</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(data.systemHealth).map(([service, status]) => (
              <div
                key={service}
                className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2"
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
                    "text-[11px]",
                    status.healthy ? "text-primary border-primary/40" : "text-destructive-foreground",
                  )}
                >
                  {status.healthy ? "Healthy" : "Degraded"}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/60 bg-card/80">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Open incidents</CardTitle>
              <p className="text-xs text-muted-foreground">
                {data.incidents.length > 0 ? "Active investigations" : "All clear"}
              </p>
            </div>
            <Badge variant="secondary" className="text-[11px]">
              {data.incidents.length}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.incidents.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
                No open incidents.
              </div>
            ) : (
              data.incidents.map((incident) => (
                <div key={incident.id} className="rounded-lg border border-border/40 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">{incident.title}</p>
                      <p className="text-xs text-muted-foreground">{incident.summary}</p>
                    </div>
                    <Badge variant="outline" className="text-[11px] uppercase">
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

        <Card className="border-border/60 bg-card/80">
          <CardHeader>
            <CardTitle className="text-base">Recent audit events</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.auditLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2 text-sm"
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
      <div className="mt-2 h-2 rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all", colors[tone])}
          style={{ width: `${Math.min(100, value)}%` }}
        />
      </div>
    </div>
  );
}
