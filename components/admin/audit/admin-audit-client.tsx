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
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@/components/ui";
import { formatDistanceToNow } from "date-fns";
import { AuthAuditAction, IncidentSeverity } from "@prisma/client";
import { toast } from "sonner";

type BaseAuditLog = inferRouterOutputs<AppRouter>["admin"]["audit"]["logs"][number];
type AuditLogEntry = BaseAuditLog & {
  user?: { id: string; handle: string | null; email: string | null } | null;
};
type AuditLogs = AuditLogEntry[];
type Incidents = inferRouterOutputs<AppRouter>["admin"]["audit"]["incidents"];

export function AdminAuditClient({
  initialLogs,
  initialIncidents,
}: {
  initialLogs: AuditLogs;
  initialIncidents: Incidents;
}) {
  const [actionFilter, setActionFilter] = useState<"all" | AuthAuditAction>("all");
  const [incidentForm, setIncidentForm] = useState<{
    title: string;
    summary: string;
    severity: IncidentSeverity;
    impact: string;
  }>({
    title: "",
    summary: "",
    severity: IncidentSeverity.SEV3,
    impact: "",
  });

  const logsQuery = trpc.admin.audit.logs.useQuery(
    {
      action: actionFilter === "all" ? undefined : actionFilter,
      limit: 40,
    },
    { initialData: initialLogs },
  );
  const incidentsQuery = trpc.admin.audit.incidents.useQuery(undefined, {
    initialData: initialIncidents,
  });

  const createIncident = trpc.admin.audit.createIncident.useMutation({
    onSuccess: () => {
      toast.success("Incident created");
      setIncidentForm({ title: "", summary: "", severity: IncidentSeverity.SEV3, impact: "" });
      incidentsQuery.refetch();
    },
    onError: (error) => toast.error("Failed to create incident", { description: error.message }),
  });
  const resolveIncident = trpc.admin.audit.resolveIncident.useMutation({
    onSuccess: () => incidentsQuery.refetch(),
    onError: (error) => toast.error("Failed to resolve incident", { description: error.message }),
  });

  const logs = (logsQuery.data ?? initialLogs) as AuditLogs;
  const incidents = incidentsQuery.data ?? initialIncidents;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="border-border/60 bg-card/80 lg:col-span-2">
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase text-muted-foreground">Traceability</p>
            <CardTitle className="text-xl">Audit log</CardTitle>
          </div>
          <Select
            value={actionFilter}
            onValueChange={(value) => setActionFilter(value as AuthAuditAction | "all")}
          >
            <SelectTrigger className="sm:w-64">
              <SelectValue placeholder="Filter actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All actions</SelectItem>
              <SelectItem value="SIGN_IN">Sign in</SelectItem>
              <SelectItem value="USER_ROLE_CHANGED">Role change</SelectItem>
              <SelectItem value="USER_STATUS_CHANGED">Status change</SelectItem>
              <SelectItem value="IMPERSONATION_STARTED">Impersonation</SelectItem>
              <SelectItem value="FEATURE_FLAG_UPDATED">Flag change</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="divide-y divide-border/60">
          {logs.map((log) => (
            <div key={log.id} className="flex items-center justify-between py-3 text-sm">
              <div>
                <p className="font-medium">{log.action}</p>
                <p className="text-xs text-muted-foreground">
                  {log.user?.handle ?? "system"} •{" "}
                  {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                </p>
              </div>
              <span className="text-xs text-muted-foreground">{log.ipAddress ?? "n/a"}</span>
            </div>
          ))}
          {logs.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No audit events.</p>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/80">
        <CardHeader>
          <CardTitle className="text-lg">Incident response</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="incident-title">Title</Label>
            <Input
              id="incident-title"
              value={incidentForm.title}
              onChange={(event) =>
                setIncidentForm((prev) => ({ ...prev, title: event.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="incident-summary">Summary</Label>
            <Textarea
              id="incident-summary"
              value={incidentForm.summary}
              onChange={(event) =>
                setIncidentForm((prev) => ({ ...prev, summary: event.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="incident-impact">Impact</Label>
            <Textarea
              id="incident-impact"
              value={incidentForm.impact}
              onChange={(event) =>
                setIncidentForm((prev) => ({ ...prev, impact: event.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Severity</Label>
            <Select
              value={incidentForm.severity}
              onValueChange={(value) =>
                setIncidentForm((prev) => ({ ...prev, severity: value as IncidentSeverity }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(IncidentSeverity).map((severity) => (
                  <SelectItem key={severity} value={severity}>
                    {severity}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={() =>
              createIncident.mutate({
                ...incidentForm,
                status: "OPEN",
              })
            }
            disabled={createIncident.isPending}
          >
            File incident
          </Button>
          <div className="space-y-3">
            {incidents.map((incident) => (
              <div
                key={incident.id}
                className="rounded-xl border border-border/60 p-3 text-sm text-muted-foreground"
              >
                <div className="flex items-center justify-between">
                  <p className="font-medium text-foreground">{incident.title}</p>
                  <Badge variant="outline">{incident.status}</Badge>
                </div>
                <p className="text-xs">{incident.summary}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  onClick={() => resolveIncident.mutate({ id: incident.id })}
                >
                  Resolve
                </Button>
              </div>
            ))}
            {incidents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No open incidents.</p>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
