"use client";

import { contestsConfig } from "@/config/contests";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { contestDetailQueryOptions, contestOverviewQueryOptions } from "@/lib/react-query/policies";
import type { ContestSummary } from "@/lib/contests/types";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import type { CellContext } from "@tanstack/react-table";
import { format, formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { ArrowRight, Users } from "@/components/icons";

const overviewConfig = contestsConfig.overview;

export const ContestsOverview = () => {
  const router = useRouter();
  const utils = trpc.useUtils();
  const overview = trpc.contests.overview.useQuery(undefined, contestOverviewQueryOptions);
  const prefetchedSlugs = useRef(new Set<string>());

  const prefetchContestDetail = useCallback(
    (slug: string | undefined) => {
      if (!slug || prefetchedSlugs.current.has(slug)) {
        return;
      }
      if (prefetchedSlugs.current.size > 100) {
        prefetchedSlugs.current.clear();
      }
      prefetchedSlugs.current.add(slug);
      utils.contests.detail.prefetch({ slug }, { staleTime: contestDetailQueryOptions.staleTime });
      router.prefetch(`/contests/${slug}`);
    },
    [router, utils],
  );

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

  useEffect(() => {
    contestRows.slice(0, 3).forEach((contest) => prefetchContestDetail(contest.slug));
  }, [contestRows, prefetchContestDetail]);

  const contestColumns = useMemo<DataTableColumn<ContestSummary, unknown>[]>(() => {
    return [
      {
        accessorKey: "name",
        header: "Contest",
        cell: ({ row }: CellContext<ContestSummary, unknown>) => (
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex size-10 items-center justify-center border-2 text-xs font-bold uppercase",
                row.original.state === "RUNNING"
                  ? "border-success text-success"
                  : row.original.state === "UPCOMING"
                    ? "border-primary text-primary"
                    : "border-border text-muted-foreground",
              )}
            >
              {row.original.name.slice(0, 2)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{row.original.name}</p>
              <p className="truncate text-[11px] uppercase text-muted-foreground">
                @{row.original.slug}
              </p>
            </div>
          </div>
        ),
      },
      {
        accessorKey: "startsAt",
        header: "Timing",
        cell: ({ row }: CellContext<ContestSummary, unknown>) => (
          <div className="text-xs">
            <p className="font-semibold">
              {formatDistanceToNow(new Date(row.original.startsAt), { addSuffix: true })}
            </p>
            <p className="text-muted-foreground">
              {format(new Date(row.original.startsAt), "MMM d • HH:mm")}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "state",
        header: "Status",
        cell: ({ row }: CellContext<ContestSummary, unknown>) => (
          <div className="flex flex-col gap-1">
            <ContestStateBadge state={row.original.state} />
            {row.original.isRated ? (
              <Badge variant="outline" className="text-[10px] uppercase">
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
            <span className="font-semibold">{row.original.registrationCount.toLocaleString()}</span>
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
            className="h-8 px-3 text-xs font-bold uppercase"
            onMouseEnter={() => prefetchContestDetail(row.original.slug)}
            onClick={() => router.push(`/contests/${row.original.slug}`)}
          >
            Open
            <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Button>
        ),
      },
    ];
  }, [prefetchContestDetail, router]);

  if (overview.isLoading) {
    return (
      <div className="space-y-8 font-mono">
        <Skeleton className="h-48 w-full border-2 border-border" />
        <Skeleton className="h-32 w-full border-2 border-border" />
        <Skeleton className="h-96 w-full border-2 border-border" />
      </div>
    );
  }

  const liveCount = overview.data?.live.length ?? 0;
  const upcomingCount = overview.data?.upcoming.length ?? 0;
  const pastCount = overview.data?.past.length ?? 0;
  const stats = [
    { ...overviewConfig.stats[0], value: liveCount },
    { ...overviewConfig.stats[1], value: upcomingCount },
    { ...overviewConfig.stats[2], value: pastCount },
  ];
  const featuredContest = overview.data?.featured ?? null;

  return (
    <div className="space-y-12 font-mono text-foreground">
      <section className="border-2 border-border bg-card p-6 md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.35em] text-primary/70">
              {overviewConfig.hero.marker}
              <span className="inline-flex items-center gap-2 border border-border px-3 py-1 text-[10px] tracking-[0.25em] text-muted-foreground">
                <span className="h-2 w-2 animate-pulse bg-primary" />
                {overviewConfig.hero.badge}
              </span>
            </div>
            <h1 className="text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
              {overviewConfig.hero.headline.line1}
              <br />
              {overviewConfig.hero.headline.line2}
              <br />
              <span className="bg-gradient-to-r from-primary via-primary to-primary/60 bg-clip-text text-transparent">
                {overviewConfig.hero.headline.line3}
              </span>
            </h1>
            <p className="max-w-3xl text-sm text-muted-foreground">
              {overviewConfig.hero.description}
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild className="h-11 px-6 text-xs font-bold uppercase">
                <Link href={overviewConfig.hero.primaryCta.href}>
                  {overviewConfig.hero.primaryCta.label}
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="h-11 border-2 border-border px-6 text-xs font-bold uppercase"
              >
                <Link href={overviewConfig.hero.secondaryCta.href}>
                  {overviewConfig.hero.secondaryCta.label}
                </Link>
              </Button>
            </div>
          </div>
          <div className="grid w-full gap-3 sm:grid-cols-3 lg:max-w-md">
            {stats.map((stat) => (
              <div key={stat.key} className="border border-border bg-background px-4 py-3">
                <p className="text-[11px] uppercase text-muted-foreground">{stat.label}</p>
                <p className="text-3xl font-black">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeader
          marker={overviewConfig.featured.marker}
          title={overviewConfig.featured.title}
          description={overviewConfig.featured.description}
        />
        <div className="border-2 border-border bg-card p-6">
          {featuredContest ? (
            <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
              <div className="space-y-2">
                <ContestStateBadge state={featuredContest.state} />
                <h2 className="text-3xl font-black tracking-tight">{featuredContest.name}</h2>
                <p className="text-sm text-muted-foreground">{featuredContest.description}</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <StatBlock
                    label="Starts"
                    value={format(new Date(featuredContest.startsAt), "MMM d • HH:mm")}
                    helper={formatDistanceToNow(new Date(featuredContest.startsAt), {
                      addSuffix: true,
                    })}
                  />
                  <StatBlock label="Problems" value={featuredContest.problemCount.toString()} />
                  <StatBlock
                    label="Registrations"
                    value={featuredContest.registrationCount.toLocaleString()}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <Badge variant="outline" className="text-[10px] uppercase">
                  {featuredContest.isRated ? "Rated" : "Unrated"}
                </Badge>
                <Button
                  className="h-12 px-6 text-xs font-bold uppercase"
                  onClick={() => router.push(`/contests/${featuredContest.slug}`)}
                >
                  {overviewConfig.featured.ctaLabel}
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{overviewConfig.featured.fallback}</p>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeader
          marker={overviewConfig.table.marker}
          title={overviewConfig.table.title}
          description={overviewConfig.table.description}
        />
        <DataTable
          columns={contestColumns}
          data={contestRows}
          searchKey="name"
          searchPlaceholder={overviewConfig.table.searchPlaceholder}
          enableColumnVisibility={false}
          enablePagination={false}
          className="border-2 border-border bg-card p-4"
          onRowHover={(row) => prefetchContestDetail(row.slug)}
          onRowClick={(row) => router.push(`/contests/${row.slug}`)}
        />
      </section>
    </div>
  );
};

function SectionHeader({
  marker,
  title,
  description,
}: {
  marker: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-primary/80">{marker}</p>
      <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <h2 className="text-3xl font-black tracking-tight">{title}</h2>
        {description ? (
          <p className="text-sm text-muted-foreground lg:max-w-xl">{description}</p>
        ) : null}
      </div>
    </div>
  );
}

function ContestStateBadge({ state }: { state: ContestSummary["state"] }) {
  const base = "border px-3 py-1 text-[11px] font-bold uppercase";
  switch (state) {
    case "RUNNING":
      return <span className={cn(base, "border-success text-success")}>Live</span>;
    case "UPCOMING":
      return <span className={cn(base, "border-primary text-primary")}>Upcoming</span>;
    default:
      return (
        <span className={cn(base, "border-muted-foreground text-muted-foreground")}>Past</span>
      );
  }
}

function StatBlock({ label, value, helper }: { label: string; value: string; helper?: string }) {
  return (
    <div className="border border-border bg-background px-4 py-3">
      <p className="text-[11px] uppercase text-muted-foreground">{label}</p>
      <p className="text-xl font-black tracking-tight">{value}</p>
      {helper ? <p className="text-xs text-muted-foreground">{helper}</p> : null}
    </div>
  );
}
