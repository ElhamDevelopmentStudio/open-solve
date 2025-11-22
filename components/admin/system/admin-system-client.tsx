"use client";

import { trpc } from "@/lib/trpc/client";
import type { AppRouter } from "@/lib/trpc/router";
import type { inferRouterOutputs } from "@trpc/server";
import { useMemo, useState } from "react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
  Switch,
  Textarea,
} from "@/components/ui";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DataTable, type DataTableColumn, DataTableColumnHeader } from "@/components/ui/data-table";
import {
  Activity,
  AlertCircle,
  Loader2,
  RefreshCw,
  Shield,
  Sparkles,
  ToggleRight,
} from "@/components/icons";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

type SystemOverview = inferRouterOutputs<AppRouter>["admin"]["system"]["overview"];
type FlagList = inferRouterOutputs<AppRouter>["admin"]["flags"]["list"];
type QueueRow = SystemOverview["judgeQueues"][number] & {
  severity: "healthy" | "warning" | "critical";
};

const QUEUE_SEVERITY_COPY: Record<QueueRow["severity"], string> = {
  healthy: "Flow normal",
  warning: "Watch",
  critical: "Backlogged",
};

const QUEUE_SEVERITY_DOTS: Record<QueueRow["severity"], string> = {
  healthy: "bg-emerald-500/80",
  warning: "bg-amber-500/80",
  critical: "bg-rose-500/80",
};

export function AdminSystemClient({
  initialSystem,
  initialFlags,
}: {
  initialSystem: SystemOverview;
  initialFlags: FlagList;
}) {
  const systemQuery = trpc.admin.system.overview.useQuery(undefined, {
    initialData: initialSystem,
    refetchInterval: 60_000,
  });
  const flagsQuery = trpc.admin.flags.list.useQuery(undefined, {
    initialData: initialFlags,
  });

  const [maintenanceMessage, setMaintenanceMessage] = useState(
    systemQuery.data?.maintenance.message ?? "",
  );
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(
    systemQuery.data?.maintenance.enabled ?? false,
  );
  const [allowSubmissions, setAllowSubmissions] = useState(
    systemQuery.data?.maintenance.allowSubmissions ?? true,
  );
  const [limits, setLimits] = useState(() => ({
    perMinute: systemQuery.data?.submissionLimits.perMinute ?? 25,
    perHour: systemQuery.data?.submissionLimits.perHour ?? 250,
    contestMultiplier: systemQuery.data?.submissionLimits.contestMultiplier ?? 2,
  }));
  const [flagDialogOpen, setFlagDialogOpen] = useState(false);
  const [flagForm, setFlagForm] = useState({
    id: "",
    key: "",
    name: "",
    description: "",
    rolloutPercentage: 0,
    enabled: false,
    targeting: "{}",
  });

  const updateMaintenance = trpc.admin.system.updateMaintenance.useMutation({
    onSuccess: () => toast.success("Maintenance settings updated"),
    onError: (error) => toast.error("Failed to update maintenance", { description: error.message }),
  });
  const updateSubmissionLimits = trpc.admin.system.updateSubmissionLimits.useMutation({
    onSuccess: () => toast.success("Submission limits updated"),
    onError: (error) => toast.error("Failed to update limits", { description: error.message }),
  });

  const saveMaintenance = () => {
    updateMaintenance.mutate({
      enabled: maintenanceEnabled,
      allowSubmissions,
      message: maintenanceMessage,
    });
  };

  const saveLimits = () => {
    updateSubmissionLimits.mutate({
      perMinute: limits.perMinute,
      perHour: limits.perHour,
      contestMultiplier: limits.contestMultiplier,
    });
  };

  const createFlag = trpc.admin.flags.create.useMutation({
    onSuccess: () => {
      toast.success("Flag created");
      flagsQuery.refetch();
      setFlagDialogOpen(false);
    },
    onError: (error) => toast.error("Failed to create flag", { description: error.message }),
  });
  const updateFlag = trpc.admin.flags.update.useMutation({
    onSuccess: () => {
      toast.success("Flag updated");
      flagsQuery.refetch();
      setFlagDialogOpen(false);
    },
    onError: (error) => toast.error("Failed to update flag", { description: error.message }),
  });
  const deleteFlag = trpc.admin.flags.delete.useMutation({
    onSuccess: () => {
      toast.success("Flag deleted");
      flagsQuery.refetch();
    },
    onError: (error) => toast.error("Failed to delete flag", { description: error.message }),
  });

  const system = systemQuery.data ?? initialSystem;
  const flags = flagsQuery.data ?? initialFlags;
  const [pendingDeleteFlag, setPendingDeleteFlag] = useState<{ id: string; name: string } | null>(
    null,
  );
  const refreshing = systemQuery.isFetching;
  const systemError = systemQuery.error;
  const lastUpdatedLabel =
    systemQuery.dataUpdatedAt && systemQuery.dataUpdatedAt > 0
      ? formatDistanceToNow(new Date(systemQuery.dataUpdatedAt), { addSuffix: true })
      : "moments ago";

  const statusMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of system.submissionStatusCounts) {
      map.set(row.status, row._count);
    }
    return map;
  }, [system.submissionStatusCounts]);

  const succeededCount = statusMap.get("SUCCEEDED") ?? 0;
  const failedCount = statusMap.get("FAILED") ?? 0;
  const pendingCount =
    (statusMap.get("QUEUED") ?? 0) +
    (statusMap.get("RUNNING") ?? 0) +
    (statusMap.get("RETRYING") ?? 0);
  const manualCount = statusMap.get("MANUAL_PENDING") ?? 0;

  const queueRows = useMemo<QueueRow[]>(
    () =>
      system.judgeQueues.map((queue) => ({
        ...queue,
        severity: queue.messages > 25 ? "critical" : queue.messages > 5 ? "warning" : "healthy",
      })),
    [system.judgeQueues],
  );

  const queueColumns = useMemo<DataTableColumn<QueueRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Queue" />,
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="rounded-xl px-3 py-1 capitalize">
              {row.original.name}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {QUEUE_SEVERITY_COPY[row.original.severity]}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "messages",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Messages" />,
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <span className="font-semibold">{row.original.messages}</span>
            <span
              className={`h-2 w-2 rounded-full ${QUEUE_SEVERITY_DOTS[row.original.severity]}`}
              aria-hidden
            />
          </div>
        ),
      },
      {
        accessorKey: "consumers",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Consumers" />,
        cell: ({ row }) => <span>{row.original.consumers}</span>,
      },
    ],
    [],
  );

  const totalQueueMessages = queueRows.reduce((sum, row) => sum + row.messages, 0);
  const totalConsumers = queueRows.reduce((sum, row) => sum + row.consumers, 0);
  const queueSeverity: QueueRow["severity"] =
    totalQueueMessages > 25 ? "critical" : totalQueueMessages > 5 ? "warning" : "healthy";

  const healthEntries = useMemo(
    () =>
      Object.entries(system.systemHealth) as Array<
        [string, SystemOverview["systemHealth"][keyof SystemOverview["systemHealth"]]]
      >,
    [system.systemHealth],
  );

  const deployment = system.deployment;
  const deployedAgo =
    deployment?.deployedAt && deployment.deployedAt.length > 0
      ? formatDistanceToNow(new Date(deployment.deployedAt), { addSuffix: true })
      : null;

  return (
    <div className="space-y-8">
      {systemError ? (
        <Alert variant="destructive" className="border-rose-500/40 bg-rose-500/5">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Unable to refresh the control plane</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center gap-3">
            {systemError.message}
            <Button
              variant="outline"
              size="sm"
              onClick={() => systemQuery.refetch()}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border/60 bg-card/80 px-4 py-4 shadow-sm">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Live snapshot</p>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-sm">
            <Badge variant="secondary" className="rounded-full px-3 py-1 capitalize">
              {system.environment}
            </Badge>
            <span className="text-muted-foreground">Updated {lastUpdatedLabel}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {refreshing ? (
            <Badge variant="outline" className="flex items-center gap-2 text-xs">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Syncing
            </Badge>
          ) : null}
          <Button
            variant="outline"
            size="sm"
            onClick={() => systemQuery.refetch()}
            disabled={systemQuery.isFetching}
            className="gap-2"
          >
            {systemQuery.isFetching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Refresh snapshot
          </Button>
        </div>
      </div>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="border-border/60 bg-card/80 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <p className="text-sm font-semibold">Active sessions</p>
              <p className="text-xs text-muted-foreground">Users currently authenticated</p>
            </div>
            <div className="rounded-2xl bg-primary/10 p-2 text-primary">
              <Activity className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{system.activeSessions.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Submissions{" "}
              <span className={allowSubmissions ? "text-green-500" : "text-amber-500"}>
                {allowSubmissions ? "allowed" : "blocked"}
              </span>{" "}
              while maintenance is{" "}
              <span className={maintenanceEnabled ? "text-rose-500" : "text-green-500"}>
                {maintenanceEnabled ? "enabled" : "off"}
              </span>
              .
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/80 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <p className="text-sm font-semibold">Judge throughput</p>
              <p className="text-xs text-muted-foreground">
                {totalConsumers} workers watching the queues
              </p>
            </div>
            <div className="rounded-2xl bg-blue-500/10 p-2 text-blue-500">
              <Shield className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-semibold">{totalQueueMessages}</span>
              <Badge
                variant="outline"
                className={`rounded-full px-3 py-1 text-xs ${
                  queueSeverity === "critical"
                    ? "border-rose-500/40 text-rose-500"
                    : queueSeverity === "warning"
                      ? "border-amber-500/40 text-amber-500"
                      : "border-emerald-500/40 text-emerald-500"
                }`}
              >
                {QUEUE_SEVERITY_COPY[queueSeverity]}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">Messages waiting across all queues.</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/80 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <p className="text-sm font-semibold">Submission flow</p>
              <p className="text-xs text-muted-foreground">Latest counts in the datastore</p>
            </div>
            <div className="rounded-2xl bg-sky-500/10 p-2 text-sky-500">
              <Sparkles className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Pending</span>
              <span className="font-semibold">{pendingCount}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Manual review</span>
              <span className="font-semibold">{manualCount}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Succeeded / Failed</span>
              <span className="font-semibold">
                {succeededCount} / {failedCount}
              </span>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[2fr,1fr]">
        <Card className="border-border/60 bg-card/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Platform health</CardTitle>
            <p className="text-sm text-muted-foreground">
              Probes cover database, RabbitMQ, and object storage availability.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {healthEntries.map(([key, check]) => (
              <div
                key={key}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 px-4 py-3"
              >
                <div>
                  <p className="font-medium capitalize">{formatHealthLabel(key)}</p>
                  <p className="text-xs text-muted-foreground">
                    {check.details ??
                      (check.latencyMs ? `${check.latencyMs}ms response time` : "No latency data")}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={`rounded-full px-3 py-1 text-xs ${
                    check.healthy
                      ? "border-emerald-500/40 text-emerald-500"
                      : "border-rose-500/40 text-rose-500"
                  }`}
                >
                  {check.healthy ? "Healthy" : "Issue"}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-card/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Deployment meta</CardTitle>
            <p className="text-sm text-muted-foreground">
              Track the build currently serving this environment.
            </p>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Commit</span>
              <span className="font-medium">
                {deployment?.commit ? deployment.commit.slice(0, 7) : "unknown"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Branch</span>
              <span className="font-medium">{deployment?.branch ?? "main"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Build ID</span>
              <span className="font-medium">{deployment?.buildId ?? "n/a"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Deployed</span>
              <span className="font-medium">{deployedAgo ?? "pending"}</span>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card className="border-border/60 bg-card/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Maintenance controls</CardTitle>
            <p className="text-sm text-muted-foreground">
              Gate judges and broadcast a banner when you need downtime.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Enable maintenance</p>
                  <p className="text-xs text-muted-foreground">
                    Sets the product into read-only mode with user messaging.
                  </p>
                </div>
                <Switch
                  checked={maintenanceEnabled}
                  onCheckedChange={(checked) => setMaintenanceEnabled(checked)}
                />
              </div>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Allow submissions</p>
                  <p className="text-xs text-muted-foreground">
                    Keep judges accessible for staff while users are gated.
                  </p>
                </div>
                <Switch
                  checked={allowSubmissions}
                  onCheckedChange={(checked) => setAllowSubmissions(checked)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="maintenance-message">Banner message</Label>
              <Textarea
                id="maintenance-message"
                value={maintenanceMessage}
                onChange={(event) => setMaintenanceMessage(event.target.value)}
                placeholder="We'll be back at HH:MM UTC…"
              />
            </div>
            <Button
              onClick={saveMaintenance}
              disabled={updateMaintenance.isPending}
              className="gap-2"
            >
              {updateMaintenance.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Shield className="h-4 w-4" />
              )}
              Save maintenance settings
            </Button>
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-card/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Submission limits</CardTitle>
            <p className="text-sm text-muted-foreground">
              Throttle bursty traffic when contests spike or the judge slows down.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="limit-minute">Per minute</Label>
                <Input
                  id="limit-minute"
                  type="number"
                  value={limits.perMinute}
                  onChange={(event) =>
                    setLimits((prev) => ({ ...prev, perMinute: Number(event.target.value) }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="limit-hour">Per hour</Label>
                <Input
                  id="limit-hour"
                  type="number"
                  value={limits.perHour}
                  onChange={(event) =>
                    setLimits((prev) => ({ ...prev, perHour: Number(event.target.value) }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="limit-contest">Contest multiplier</Label>
                <Input
                  id="limit-contest"
                  type="number"
                  value={limits.contestMultiplier}
                  onChange={(event) =>
                    setLimits((prev) => ({
                      ...prev,
                      contestMultiplier: Number(event.target.value),
                    }))
                  }
                />
              </div>
            </div>
            <Button
              onClick={saveLimits}
              disabled={updateSubmissionLimits.isPending}
              className="gap-2"
            >
              {updateSubmissionLimits.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ToggleRight className="h-4 w-4" />
              )}
              Save limits
            </Button>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.4fr,1fr]">
        <Card className="border-border/60 bg-card/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Judge queues</CardTitle>
            <p className="text-sm text-muted-foreground">
              Live RabbitMQ depth across submissions, rejudge, and manual review channels.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <DataTable
              columns={queueColumns}
              data={queueRows}
              enablePagination={false}
              enableColumnVisibility={false}
            />
            <p className="text-xs text-muted-foreground">
              Total consumers online: {totalConsumers}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-card/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Submission insights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-border/60 bg-background/60 px-4 py-3">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted-foreground">Pending</span>
                <span className="font-semibold">{pendingCount}</span>
              </div>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted-foreground">Manual review</span>
                <span className="font-semibold">{manualCount}</span>
              </div>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/60 px-4 py-3 text-sm">
              <p className="text-muted-foreground">Maintenance banner</p>
              <p className="mt-1 font-medium">
                {maintenanceMessage.trim() ? maintenanceMessage : "No active messaging"}
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <Card className="border-border/60 bg-card/80 shadow-sm">
        <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase text-muted-foreground">Feature flags</p>
            <CardTitle className="text-xl">Experiment control</CardTitle>
          </div>
          <Dialog open={flagDialogOpen} onOpenChange={setFlagDialogOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={() =>
                  setFlagForm({
                    id: "",
                    key: "",
                    name: "",
                    description: "",
                    rolloutPercentage: 0,
                    enabled: false,
                    targeting: "{}",
                  })
                }
              >
                New flag
              </Button>
            </DialogTrigger>
            <DialogContent className="space-y-4">
              <DialogHeader>
                <DialogTitle>{flagForm.id ? "Edit flag" : "Create flag"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-2">
                <Label htmlFor="flag-key">Key</Label>
                <Input
                  id="flag-key"
                  value={flagForm.key}
                  onChange={(event) =>
                    setFlagForm((prev) => ({ ...prev, key: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="flag-name">Name</Label>
                <Input
                  id="flag-name"
                  value={flagForm.name}
                  onChange={(event) =>
                    setFlagForm((prev) => ({ ...prev, name: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="flag-description">Description</Label>
                <Textarea
                  id="flag-description"
                  value={flagForm.description}
                  onChange={(event) =>
                    setFlagForm((prev) => ({ ...prev, description: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="flag-rollout">Rollout %</Label>
                <Input
                  id="flag-rollout"
                  type="number"
                  value={flagForm.rolloutPercentage}
                  onChange={(event) =>
                    setFlagForm((prev) => ({
                      ...prev,
                      rolloutPercentage: Number(event.target.value),
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="flag-targeting">Targeting JSON</Label>
                <Textarea
                  id="flag-targeting"
                  value={flagForm.targeting}
                  onChange={(event) =>
                    setFlagForm((prev) => ({ ...prev, targeting: event.target.value }))
                  }
                />
              </div>
              <div className="flex items-center justify-between rounded-xl border border-border/60 px-3 py-2">
                <span className="text-sm font-medium">Enabled</span>
                <Switch
                  checked={flagForm.enabled}
                  onCheckedChange={(checked) =>
                    setFlagForm((prev) => ({ ...prev, enabled: checked }))
                  }
                />
              </div>
              <Button
                onClick={() => {
                  try {
                    const payload = {
                      key: flagForm.key,
                      name: flagForm.name,
                      description: flagForm.description,
                      rolloutPercentage: flagForm.rolloutPercentage,
                      enabled: flagForm.enabled,
                      targeting: JSON.parse(flagForm.targeting || "{}"),
                    };
                    if (flagForm.id) {
                      updateFlag.mutate({ id: flagForm.id, ...payload });
                    } else {
                      createFlag.mutate(payload);
                    }
                  } catch {
                    toast.error("Targeting JSON is invalid");
                  }
                }}
              >
                {flagForm.id ? "Update flag" : "Create flag"}
              </Button>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="space-y-3">
          {flags.map((flag) => (
            <div
              key={flag.id}
              className="flex flex-col gap-2 rounded-xl border border-border/60 bg-background/80 p-4 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{flag.name}</p>
                  <Badge
                    variant={flag.enabled ? "outline" : "secondary"}
                    className={flag.enabled ? "border-emerald-500/40 text-emerald-500" : undefined}
                  >
                    {flag.enabled ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{flag.description}</p>
                <p className="text-xs text-muted-foreground">Key: {flag.key}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFlagForm({
                      id: flag.id,
                      key: flag.key,
                      name: flag.name,
                      description: flag.description ?? "",
                      rolloutPercentage: flag.rolloutPercentage,
                      enabled: flag.enabled,
                      targeting: JSON.stringify(flag.targeting ?? {}, null, 2),
                    });
                    setFlagDialogOpen(true);
                  }}
                >
                  Edit
                </Button>
                <Button
                  variant={flag.enabled ? "outline" : "default"}
                  size="sm"
                  onClick={() =>
                    updateFlag.mutate({
                      id: flag.id,
                      key: flag.key,
                      name: flag.name,
                      description: flag.description ?? "",
                      rolloutPercentage: flag.rolloutPercentage,
                      enabled: !flag.enabled,
                      targeting: (flag.targeting as Record<string, unknown>) ?? undefined,
                    })
                  }
                >
                  Toggle
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setPendingDeleteFlag({ id: flag.id, name: flag.name })}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
          {flags.length === 0 ? (
            <p className="text-sm text-muted-foreground">No flags configured.</p>
          ) : null}
        </CardContent>
      </Card>
      <ConfirmDialog
        variant="destructive"
        open={pendingDeleteFlag !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteFlag(null);
        }}
        title="Delete feature flag?"
        description={
          pendingDeleteFlag
            ? `This removes ${pendingDeleteFlag.name} and disables related rollout targeting.`
            : ""
        }
        confirmLabel="Delete"
        loading={deleteFlag.isPending}
        onConfirm={() => {
          if (pendingDeleteFlag) {
            deleteFlag.mutate({ id: pendingDeleteFlag.id });
            setPendingDeleteFlag(null);
          }
        }}
      />
    </div>
  );
}

const formatHealthLabel = (key: string) => {
  switch (key) {
    case "database":
      return "Database";
    case "rabbitmq":
      return "RabbitMQ";
    case "objectStorage":
      return "Object Storage";
    default:
      return key;
  }
};
