"use client";

import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { ContestSummary } from "@/lib/contests/types";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import type { CellContext } from "@tanstack/react-table";
import { format, formatDistanceToNow } from "date-fns";
import { Trophy, Clock, Sparkles, Users, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";

export const ContestsOverview = () => {
  const router = useRouter();
  const overview = trpc.contests.overview.useQuery();

  const contestRows = useMemo(() => {
    if (!overview.data) return [];
    const rows: ContestSummary[] = [];
    
    if (overview.data.featured) {
      rows.push(overview.data.featured);
    }
    rows.push(...overview.data.live);
    rows.push(...overview.data.upcoming);
    rows.push(...overview.data.past.slice(0, 10));
    
    return rows;
  }, [overview.data]);

  const contestColumns = useMemo<DataTableColumn<ContestSummary, unknown>[]>(() => {
    return [
      {
        accessorKey: "name",
        header: "Contest",
        cell: ({ row }: CellContext<ContestSummary, unknown>) => (
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border text-sm font-semibold uppercase",
                row.original.state === "RUNNING"
                  ? "border-success/50 bg-success/10 text-success"
                  : row.original.state === "UPCOMING"
                    ? "border-primary/50 bg-primary/10 text-primary"
                    : "border-border/60 bg-muted/60 text-muted-foreground"
              )}
            >
              {row.original.name.slice(0, 2)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{row.original.name}</p>
              <p className="truncate text-xs text-muted-foreground">@{row.original.slug}</p>
            </div>
          </div>
        ),
      },
      {
        accessorKey: "startsAt",
        header: "Timing",
        cell: ({ row }: CellContext<ContestSummary, unknown>) => (
          <div className="text-xs">
            <p className="font-medium">{formatDistanceToNow(new Date(row.original.startsAt), { addSuffix: true })}</p>
            <p className="text-muted-foreground">{format(new Date(row.original.startsAt), "MMM d, HH:mm")}</p>
          </div>
        ),
      },
      {
        accessorKey: "state",
        header: "Status",
        cell: ({ row }: CellContext<ContestSummary, unknown>) => (
          <div className="flex flex-col gap-1.5">
            <ContestStateBadge state={row.original.state} />
            {row.original.isRated ? (
              <Badge variant="secondary" className="w-fit rounded-full border border-primary/30 bg-primary/5 text-[10px] text-primary">
                Rated
              </Badge>
            ) : null}
          </div>
        ),
      },
      {
        accessorKey: "registrationCount",
        header: "Participants",
        cell: ({ row }: CellContext<ContestSummary, unknown>) => (
          <div className="flex items-center gap-2 text-xs">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{row.original.registrationCount.toLocaleString()}</span>
          </div>
        ),
      },
      {
        accessorKey: "actions",
        header: "",
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }: CellContext<ContestSummary, unknown>) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/contests/${row.original.slug}`);
            }}
            className="h-8 rounded-lg"
          >
            View
            <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Button>
        ),
      },
    ];
  }, [router]);

  if (overview.isLoading) {
    return (
      <div className="mx-auto max-w-7xl space-y-8 animate-fade-in">
        <div>
          <Skeleton className="h-10 w-64 rounded-xl" />
          <Skeleton className="mt-3 h-5 w-96 rounded-lg" />
        </div>
        <div className="premium-card rounded-2xl p-8">
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  const featuredContest = overview.data?.featured;
  const liveCount = overview.data?.live.length ?? 0;
  const upcomingCount = overview.data?.upcoming.length ?? 0;

  return (
    <div className="mx-auto max-w-7xl space-y-8 animate-fade-in">
      <div className="space-y-3">
        <h1 className="text-4xl font-bold tracking-tight">Contests</h1>
        <p className="text-base text-muted-foreground">
          Compete in rated coding challenges and climb the leaderboard
        </p>
        
        <div className="flex flex-wrap gap-3 pt-2">
          <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-card/50 px-4 py-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">{liveCount} Live</span>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-card/50 px-4 py-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{upcomingCount} Upcoming</span>
          </div>
        </div>
      </div>

      {featuredContest ? (
        <div className="premium-card group overflow-hidden rounded-2xl p-0">
          <div className="relative flex flex-col gap-6 p-8 md:flex-row md:items-center">
            <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-primary/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
            
            <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/70 shadow-lg">
              <Trophy className="h-8 w-8 text-primary-foreground" />
            </div>

            <div className="flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="rounded-full bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
                  Featured
                </Badge>
                <ContestStateBadge state={featuredContest.state} />
              </div>
              <h2 className="text-2xl font-bold tracking-tight">{featuredContest.name}</h2>
              {featuredContest.description ? (
                <p className="text-sm text-muted-foreground">{featuredContest.description}</p>
              ) : null}
              <div className="flex flex-wrap gap-4 pt-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {formatDistanceToNow(new Date(featuredContest.startsAt), { addSuffix: true })}
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  {featuredContest.registrationCount.toLocaleString()} participants
                </div>
              </div>
            </div>

            <Button asChild size="lg" className="rounded-xl md:flex-shrink-0">
              <Link href={`/contests/${featuredContest.slug}`}>
                View Contest
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      ) : null}

      <div className="premium-card space-y-6 rounded-2xl p-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">All Contests</h2>
            <p className="text-sm text-muted-foreground">Browse and join upcoming competitions</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => overview.refetch()}
            className="rounded-xl"
          >
            Refresh
          </Button>
        </div>

        <DataTable
          columns={contestColumns}
          data={contestRows}
          searchKey="name"
          searchPlaceholder="Search contests..."
          pageSize={10}
          onRowClick={(row) => router.push(`/contests/${row.slug}`)}
          emptyMessage="No contests available at the moment."
        />
      </div>
    </div>
  );
};

const ContestStateBadge = ({ state }: { state: string }) => {
  const styles: Record<string, string> = {
    UPCOMING: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200",
    RUNNING: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200",
    FINISHED: "bg-muted text-muted-foreground",
    ARCHIVED: "bg-muted text-muted-foreground",
  };
  
  const labelMap: Record<string, string> = {
    UPCOMING: "Upcoming",
    RUNNING: "Live",
    FINISHED: "Finished",
    ARCHIVED: "Archived",
  };
  
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold", styles[state] ?? "bg-muted text-muted-foreground")}>
      {labelMap[state] ?? state.toLowerCase()}
    </span>
  );
};

