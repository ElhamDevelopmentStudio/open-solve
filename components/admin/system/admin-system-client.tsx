"use client";

import { trpc } from "@/lib/trpc/client";
import type { AppRouter } from "@/lib/trpc/router";
import type { inferRouterOutputs } from "@trpc/server";
import { useState } from "react";
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
import { toast } from "sonner";
import { ToggleLeft, ToggleRight } from "lucide-react";

type SystemOverview = inferRouterOutputs<AppRouter>["admin"]["system"]["overview"];
type FlagList = inferRouterOutputs<AppRouter>["admin"]["flags"]["list"];

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

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="border-border/60 bg-card/80">
        <CardHeader>
          <CardTitle className="text-lg">Maintenance mode</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-xl border border-border/60 bg-background px-4 py-3">
            <div>
              <p className="font-medium">Enable maintenance</p>
              <p className="text-xs text-muted-foreground">
                Force read-only mode with a banner across the platform.
              </p>
            </div>
            <Switch
              checked={maintenanceEnabled}
              onCheckedChange={(checked) => setMaintenanceEnabled(checked)}
            />
          </div>
          <div className="flex items-center justify-between rounded-xl border border-border/60 bg-background px-4 py-3">
            <div>
              <p className="font-medium">Allow submissions</p>
              <p className="text-xs text-muted-foreground">Keep judge available for staff/curators.</p>
            </div>
            <Switch
              checked={allowSubmissions}
              onCheckedChange={(checked) => setAllowSubmissions(checked)}
            />
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
          <Button onClick={saveMaintenance} disabled={updateMaintenance.isPending} className="gap-2">
            {updateMaintenance.isPending ? <ToggleLeft className="h-4 w-4 animate-spin" /> : <ToggleRight className="h-4 w-4" />}
            Save maintenance settings
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/80">
        <CardHeader>
          <CardTitle className="text-lg">Submission limits</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <Label>Per minute</Label>
              <Input
                type="number"
                value={limits.perMinute}
                onChange={(event) => setLimits((prev) => ({ ...prev, perMinute: Number(event.target.value) }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Per hour</Label>
              <Input
                type="number"
                value={limits.perHour}
                onChange={(event) => setLimits((prev) => ({ ...prev, perHour: Number(event.target.value) }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Contest multiplier</Label>
              <Input
                type="number"
                value={limits.contestMultiplier}
                onChange={(event) =>
                  setLimits((prev) => ({ ...prev, contestMultiplier: Number(event.target.value) }))
                }
              />
            </div>
          </div>
          <Button onClick={saveLimits} disabled={updateSubmissionLimits.isPending}>
            Save limits
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/80 lg:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <p className="text-xs uppercase text-muted-foreground">Feature flags</p>
            <CardTitle className="text-xl">Experiment control</CardTitle>
          </div>
          <Dialog open={flagDialogOpen} onOpenChange={setFlagDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setFlagForm({ id: "", key: "", name: "", description: "", rolloutPercentage: 0, enabled: false, targeting: "{}" })}>
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
                  onChange={(event) => setFlagForm((prev) => ({ ...prev, key: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="flag-name">Name</Label>
                <Input
                  id="flag-name"
                  value={flagForm.name}
                  onChange={(event) => setFlagForm((prev) => ({ ...prev, name: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="flag-description">Description</Label>
                <Textarea
                  id="flag-description"
                  value={flagForm.description}
                  onChange={(event) => setFlagForm((prev) => ({ ...prev, description: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="flag-rollout">Rollout %</Label>
                <Input
                  id="flag-rollout"
                  type="number"
                  value={flagForm.rolloutPercentage}
                  onChange={(event) =>
                    setFlagForm((prev) => ({ ...prev, rolloutPercentage: Number(event.target.value) }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="flag-targeting">Targeting JSON</Label>
                <Textarea
                  id="flag-targeting"
                  value={flagForm.targeting}
                  onChange={(event) => setFlagForm((prev) => ({ ...prev, targeting: event.target.value }))}
                />
              </div>
              <div className="flex items-center justify-between rounded-xl border border-border/60 px-3 py-2">
                <span className="text-sm font-medium">Enabled</span>
                <Switch
                  checked={flagForm.enabled}
                  onCheckedChange={(checked) => setFlagForm((prev) => ({ ...prev, enabled: checked }))}
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
                  <Badge variant={flag.enabled ? "outline" : "secondary"}>
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
                <Button variant="destructive" size="sm" onClick={() => deleteFlag.mutate({ id: flag.id })}>
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
    </div>
  );
}
