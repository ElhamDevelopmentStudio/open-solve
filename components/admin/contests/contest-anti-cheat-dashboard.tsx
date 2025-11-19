"use client";

import { useMemo, useState } from "react";
import type { inferRouterOutputs } from "@trpc/server";
import { trpc } from "@/lib/trpc/client";
import type { AppRouter } from "@/lib/trpc/router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type DataTableColumn, DataTableColumnHeader } from "@/components/ui/data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ContestAntiCheatFlagStatus, type ContestState, type ContestType } from "@prisma/client";
import { formatDistanceToNow } from "date-fns";
import { Clock, Shield, Sparkles } from "@/components/icons";
import { Alert01Icon } from "hugeicons-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type ParticipantRow = inferRouterOutputs<AppRouter>["admin"]["antiCheat"]["participants"][number];

export function ContestAntiCheatDashboard({
  contest,
  initialParticipants,
}: {
  contest: {
    id: string;
    name: string;
    slug: string;
    state: ContestState;
    type: ContestType;
  };
  initialParticipants: ParticipantRow[];
}) {
  const [selectedRegistrationId, setSelectedRegistrationId] = useState<string | null>(null);
  const participantsQuery = trpc.admin.antiCheat.participants.useQuery(
    { contestId: contest.id },
    { initialData: initialParticipants, refetchInterval: 30000 },
  );
  const selectedParticipant = participantsQuery.data?.find(
    (participant) => participant.registrationId === selectedRegistrationId,
  );
  const timelineQuery = trpc.admin.antiCheat.timeline.useQuery(
    { registrationId: selectedRegistrationId ?? "" },
    { enabled: Boolean(selectedRegistrationId) },
  );
  const clustersQuery = trpc.admin.antiCheat.clusters.useQuery({ contestId: contest.id });
  const setStatusMutation = trpc.admin.antiCheat.setStatus.useMutation({
    onSuccess: () => {
      toast.success("Status updated");
      participantsQuery.refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const participants = participantsQuery.data ?? initialParticipants;
  const flaggedCount = participants.filter((entry) => entry.status !== "CLEAN").length;
  const disqualifiedCount = participants.filter((entry) => entry.status === "DISQUALIFIED").length;

  const columns = useMemo<DataTableColumn<ParticipantRow>[]>(
    () => [
      {
        id: "participantHandle",
        accessorFn: (row) => row.participant.handle,
        header: ({ column }) => <DataTableColumnHeader column={column} title="Participant" />,
        cell: ({ row }) => (
          <div>
            <p className="font-medium">
              {row.original.participant.name ?? row.original.participant.handle}
            </p>
            <p className="text-xs text-muted-foreground">@{row.original.participant.handle}</p>
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        accessorKey: "metrics.tabSwitches",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Tab switches" />,
        cell: ({ row }) => <span>{row.original.metrics.tabSwitches}</span>,
      },
      {
        accessorKey: "metrics.outOfFocusMs",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Out of focus" />,
        cell: ({ row }) => <span>{Math.round(row.original.metrics.outOfFocusMs / 1000)}s</span>,
      },
      {
        accessorKey: "metrics.largePastes",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Large pastes" />,
        cell: ({ row }) => <span>{row.original.metrics.largePastes}</span>,
      },
      {
        accessorKey: "riskScore",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Risk" />,
        cell: ({ row }) => (
          <span className="font-semibold text-rose-500 dark:text-rose-300">
            {row.original.riskScore}
          </span>
        ),
      },
      {
        accessorKey: "lastEventAt",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Last activity" />,
        cell: ({ row }) =>
          row.original.lastEventAt ? (
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(row.original.lastEventAt), { addSuffix: true })}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-8">
      <Card className="border-border/60 bg-card/80">
        <CardHeader>
          <CardTitle className="text-xl font-semibold tracking-tight">
            Anti-cheat control · {contest.name}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Focus, device, and similarity telemetry for this educational contest.
          </p>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <MetricCard
            title="Participants monitored"
            value={participants.length.toString()}
            icon={<Clock className="h-4 w-4 text-primary" />}
            subtitle={`${flaggedCount} flagged`}
          />
          <MetricCard
            title="Active flags"
            value={flaggedCount.toString()}
            icon={<Shield className="h-4 w-4 text-amber-500" />}
            subtitle={`${disqualifiedCount} disqualified`}
          />
          <MetricCard
            title="Clusters detected"
            value={(clustersQuery.data?.length ?? 0).toString()}
            icon={<Sparkles className="h-4 w-4 text-emerald-500" />}
            subtitle="Similarity scans refreshed on demand"
          />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="border-border/60 bg-card/80">
          <CardHeader className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="text-lg">Participants</CardTitle>
              <p className="text-sm text-muted-foreground">
                Click a row for the anti-cheat timeline.
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={columns}
              data={participants}
              searchKey="participantHandle"
              pageSize={8}
              onRowClick={(row) => setSelectedRegistrationId(row.registrationId)}
              emptyMessage="No participants have telemetry yet."
            />
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-card/80">
          <CardHeader>
            <CardTitle className="text-lg">
              {selectedParticipant
                ? `Timeline · @${selectedParticipant.participant.handle}`
                : "Timeline"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedParticipant ? (
              <>
                <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-muted/40 p-3">
                  <StatusBadge status={selectedParticipant.status} />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        Change status
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {Object.values(ContestAntiCheatFlagStatus).map((status) => (
                        <DropdownMenuItem
                          key={status}
                          onClick={() =>
                            setStatusMutation.mutate({ flagId: selectedParticipant.id, status })
                          }
                        >
                          {status.toLowerCase()}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <ScrollArea className="h-[320px]">
                  <ul className="space-y-3">
                    {timelineQuery.data
                      ? timelineQuery.data.map((event) => (
                          <li
                            key={event.id}
                            className="rounded-xl border border-border/50 bg-muted/40 p-3 text-sm"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium">
                                {event.type.replaceAll("_", " ").toLowerCase()}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(event.occurredAt), {
                                  addSuffix: true,
                                })}
                              </span>
                            </div>
                            {event.note ? (
                              <p className="text-xs text-muted-foreground mt-1">{event.note}</p>
                            ) : null}
                          </li>
                        ))
                      : new Array(4)
                          .fill(null)
                          .map((_, index) => (
                            <li key={index} className="h-16 rounded-xl bg-muted/40" />
                          ))}
                  </ul>
                </ScrollArea>
              </>
            ) : (
              <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
                <Alert01Icon className="mb-3 h-6 w-6" />
                Select a participant to review their telemetry timeline.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  icon,
  subtitle,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background/80 p-4 shadow-inner shadow-black/5">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        {icon}
        {title}
      </div>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
    </div>
  );
}

function StatusBadge({ status }: { status: ContestAntiCheatFlagStatus }) {
  const tone =
    status === "CLEAN"
      ? "bg-emerald-500/10 text-emerald-600"
      : status === "WARNING"
        ? "bg-amber-500/10 text-amber-600"
        : status === "UNDER_REVIEW"
          ? "bg-blue-500/10 text-blue-600"
          : status === "SUSPICIOUS"
            ? "bg-rose-500/10 text-rose-500"
            : "bg-slate-500/10 text-slate-500";
  return (
    <Badge className={cn("rounded-full capitalize", tone)}>
      {status.replaceAll("_", " ").toLowerCase()}
    </Badge>
  );
}
