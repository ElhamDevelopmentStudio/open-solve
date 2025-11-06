"use client";

import { ProblemFiltersPanel } from "@/components/problems/problem-filters-panel";
import { ProblemStatusBadge } from "@/components/problems/problem-status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useProblemFilters } from "@/hooks/use-problem-filters";
import { publicContentQueryOptions } from "@/lib/react-query/policies";
import { trackEvent } from "@/lib/telemetry/client";
import { trpc } from "@/lib/trpc/client";
import type {
  ProblemFiltersInput,
  ProblemListItem,
  ProblemListResponse,
} from "@/lib/trpc/router/problems";
import { cn } from "@/lib/utils";
import { stableHash } from "@/lib/utils/stable-hash";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { formatDistanceToNow } from "date-fns";
import { 
  ArrowRight01Icon,
  Search01Icon,
  FilterIcon,
  SlidersHorizontalIcon,
  Clock01Icon,
  BookmarkCheck01Icon as BookmarkIcon,
  Cancel01Icon
} from "hugeicons-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { KeyboardEvent } from "react";
import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from "react";

const SORT_LABELS: Record<ProblemFiltersInput["sort"], string> = {
  relevance: "Relevance",
  newest: "Newest",
  difficulty: "Difficulty ↑",
  difficulty_desc: "Difficulty ↓",
};

const difficultyTone: Record<string, string> = {
  EASY: "text-emerald-700 bg-emerald-50/80 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-950/50 dark:border-emerald-800/50",
  MEDIUM:
    "text-amber-700 bg-amber-50/80 border-amber-200 dark:text-amber-300 dark:bg-amber-950/50 dark:border-amber-800/50",
  HARD: "text-rose-700 bg-rose-50/80 border-rose-200 dark:text-rose-300 dark:bg-rose-950/50 dark:border-rose-800/50",
};

const DEFAULT_FILTERS: ProblemFiltersInput = {
  q: "",
  difficulty: [],
  status: [],
  tags: [],
  onlyWithEditorial: false,
  sort: "newest",
  page: 1,
};

const VIRTUALIZATION_THRESHOLD = 50;

export function ProblemLibraryShell({ initialFilters }: { initialFilters: ProblemFiltersInput }) {
  const router = useRouter();
  const [filters, setFilters] = useProblemFilters();
  const mergedFilters = useMemo<ProblemFiltersInput>(
    () => ({ ...DEFAULT_FILTERS, ...initialFilters, ...filters }),
    [filters, initialFilters],
  );
  const [searchValue, setSearchValue] = useState(mergedFilters.q ?? "");

  useEffect(() => {
    setSearchValue(mergedFilters.q ?? "");
  }, [mergedFilters.q]);

  useEffect(() => {
    const handle = setTimeout(() => {
      if (searchValue === mergedFilters.q) return;
      setFilters({ q: searchValue, page: 1 });
    }, 250);
    return () => clearTimeout(handle);
  }, [searchValue, mergedFilters.q, setFilters]);

  const {
    data: listData,
    isFetching,
    isPending,
  } = trpc.problems.list.useQuery(mergedFilters, {
    placeholderData: (previousData) => previousData,
    staleTime: publicContentQueryOptions.staleTime,
  });
  const { data: metadata } = trpc.problems.filterMetadata.useQuery(undefined, {
    staleTime: publicContentQueryOptions.staleTime,
  });

  const [filtersOpen, setFiltersOpen] = useState(false);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (mergedFilters.q) count += 1;
    count += mergedFilters.difficulty.length;
    count += mergedFilters.status.length;
    count += mergedFilters.tags.length;
    if (mergedFilters.onlyWithEditorial) count += 1;
    return count;
  }, [mergedFilters]);
  const hasActiveFilters = activeFilterCount > 0;

  const results: ProblemListResponse | null = listData ?? null;
  const items = results?.items ?? [];
  const filtersHash = useMemo(() => stableHash(mergedFilters), [mergedFilters]);
  const previousFiltersHash = useRef(filtersHash);
  const zeroResultHashes = useRef(new Set<string>());
  const virtualizationEnabled = items.length > VIRTUALIZATION_THRESHOLD;
  const rowVirtualizer = useWindowVirtualizer({
    count: virtualizationEnabled ? items.length : 0,
    estimateSize: () => 148,
    overscan: 8,
  });
  const cardRefs = useRef<Array<HTMLDivElement | null>>([]);

  useEffect(() => {
    cardRefs.current = cardRefs.current.slice(0, items.length);
  }, [items.length]);

  const registerCardRef = useCallback((index: number, node: HTMLDivElement | null) => {
    cardRefs.current[index] = node;
  }, []);

  const focusCard = useCallback(
    (index: number) => {
      if (index < 0 || index >= items.length) {
        return;
      }

      if (virtualizationEnabled) {
        rowVirtualizer.scrollToIndex(index, { align: "auto" });
        requestAnimationFrame(() => {
          cardRefs.current[index]?.focus();
        });
      } else {
        cardRefs.current[index]?.focus();
      }
    },
    [items.length, rowVirtualizer, virtualizationEnabled],
  );

  const openProblem = useCallback(
    (slug: string) => {
      router.push(`/problems/${slug}`);
    },
    [router],
  );

  const renderCard = useCallback(
    (problem: ProblemListItem, index: number, animationOrder = index) => (
      <ProblemCard
        ref={(node) => registerCardRef(index, node)}
        key={problem.id}
        problem={problem}
        isFetching={isFetching}
        index={index}
        animationOrder={animationOrder}
        onFocusRequest={focusCard}
        onOpen={openProblem}
      />
    ),
    [focusCard, isFetching, openProblem, registerCardRef],
  );

  const handleFilterChange = (patch: Partial<ProblemFiltersInput>, resetPage = true) => {
    setFilters({
      ...patch,
      ...(resetPage ? { page: 1 } : {}),
    });
  };

  const handleClearAll = () => {
    setFilters(DEFAULT_FILTERS);
    router.push("/problems");
  };

  const listIsEmpty = !isPending && items.length === 0;

  useEffect(() => {
    if (!mergedFilters.q) return;
    trackEvent("problems.search", { query: mergedFilters.q });
  }, [mergedFilters.q]);

  useEffect(() => {
    if (previousFiltersHash.current === filtersHash) {
      return;
    }
    trackEvent("problems.filters.change", { filters: mergedFilters });
    previousFiltersHash.current = filtersHash;
  }, [filtersHash, mergedFilters]);

  useEffect(() => {
    if (!listIsEmpty) return;
    if (zeroResultHashes.current.has(filtersHash)) return;
    zeroResultHashes.current.add(filtersHash);
    trackEvent("problems.zeroResults", { filters: mergedFilters });
  }, [filtersHash, listIsEmpty, mergedFilters]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof performance === "undefined") {
      return;
    }
    const navEntries = performance.getEntriesByType("navigation") as
      | PerformanceNavigationTiming[]
      | undefined;
    const nav = navEntries?.[0];
    if (nav) {
      const ttfb = nav.responseStart - nav.requestStart;
      const domReady = nav.domContentLoadedEventEnd - nav.startTime;
      trackEvent("problems.performance", {
        ttfb: Number.isFinite(ttfb) ? Number(ttfb.toFixed(2)) : undefined,
        domReady: Number.isFinite(domReady) ? Number(domReady.toFixed(2)) : undefined,
      });
    }

    let observer: PerformanceObserver | null = null;
    if (typeof PerformanceObserver !== "undefined") {
      observer = new PerformanceObserver((entryList) => {
        const entry = entryList.getEntries().at(-1);
        if (!entry) return;
        trackEvent("problems.performance", {
          lcp: Number(entry.startTime.toFixed(2)),
        });
        observer?.disconnect();
      });
      try {
        observer.observe({ type: "largest-contentful-paint", buffered: true });
      } catch {
        observer.disconnect();
      }
    }

    return () => observer?.disconnect();
  }, []);

  return (
    <TooltipProvider>
      <a href="#problem-library-results" className="skip-link sr-only focus:not-sr-only">
        Skip to results
      </a>
      <div className="space-y-8">
        <header className="space-y-6">
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Problem Library</p>
            <h1 className="text-4xl font-bold tracking-tight lg:text-5xl">Browse Problems</h1>
            <p className="max-w-2xl text-base text-muted-foreground">
              Explore our curated collection of coding challenges across various topics and difficulty levels
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[280px]">
              <Search01Icon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" strokeWidth={2} />
              <Input
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder="Search problems by title or description..."
                aria-label="Search problems"
                className="h-12 rounded-xl pl-11 pr-24 text-base transition-all focus:shadow-lg focus:shadow-primary/5"
              />
              <span
                className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground"
                aria-live="polite"
              >
                {results?.total ?? 0} results
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Label htmlFor="sort" className="text-sm text-muted-foreground">
                Sort
              </Label>
              <Select
                value={mergedFilters.sort}
                onValueChange={(value) =>
                  handleFilterChange({ sort: value as ProblemFiltersInput["sort"] })
                }
              >
                <SelectTrigger id="sort" className="w-[170px] rounded-xl focus-ring">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SORT_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Drawer open={filtersOpen} onOpenChange={setFiltersOpen} direction="bottom">
                <DrawerTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 rounded-xl lg:hidden">
                    <FilterIcon className="h-4 w-4" strokeWidth={2} /> Filters
                    {hasActiveFilters && (
                      <Badge variant="secondary" className="ml-1 h-5 rounded-full px-1.5 text-[10px] font-semibold">
                        {activeFilterCount}
                      </Badge>
                    )}
                  </Button>
                </DrawerTrigger>
                <DrawerContent className="h-[88vh] rounded-t-3xl border-t bg-background p-1 pb-4">
                  <DrawerHeader className="pb-2">
                    <DrawerTitle className="flex items-center justify-center gap-2 text-base">
                      <SlidersHorizontalIcon className="h-4 w-4" strokeWidth={2} /> Filters
                    </DrawerTitle>
                  </DrawerHeader>
                  <div className="h-[calc(100%-120px)] overflow-y-auto px-5 pb-4">
                    <ProblemFiltersPanel
                      filters={mergedFilters}
                      metadata={metadata}
                      onChange={handleFilterChange}
                      onReset={handleClearAll}
                      isMobile
                    />
                  </div>
                  <DrawerFooter className="border-t bg-background px-5">
                    <Button variant="ghost" onClick={handleClearAll} disabled={!hasActiveFilters}>
                      Reset
                    </Button>
                    <DrawerClose asChild>
                      <Button>Done</Button>
                    </DrawerClose>
                  </DrawerFooter>
                </DrawerContent>
              </Drawer>
            </div>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <aside
            className="hidden rounded-2xl border border-border/50 bg-card/80 p-4 shadow-sm backdrop-blur-sm lg:block"
            aria-label="Filter panel"
          >
            <ProblemFiltersPanel
              filters={mergedFilters}
              metadata={metadata}
              onChange={handleFilterChange}
              onReset={handleClearAll}
            />
          </aside>
          <section className="space-y-4" aria-live={isPending ? "polite" : "off"}>
            {isPending && !results ? (
              <ProblemListSkeleton />
            ) : (
              <div
                id="problem-library-results"
                role="list"
                aria-busy={isPending}
                className="space-y-3"
              >
                {listIsEmpty ? (
                  <EmptyState onReset={handleClearAll} />
                ) : virtualizationEnabled ? (
                  <div className="relative" role="presentation">
                    <div style={{ height: rowVirtualizer.getTotalSize() }}>
                      {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                        const problem = items[virtualRow.index];
                        if (!problem) return null;
                        return (
                          <div
                            key={problem.id}
                            className="absolute inset-x-0"
                            style={{ transform: `translateY(${virtualRow.start}px)` }}
                          >
                            {renderCard(problem, virtualRow.index, 0)}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  items.map((problem, index) => renderCard(problem, index, Math.min(index, 5)))
                )}
              </div>
            )}

            {results && results.pageCount > 1 ? (
              <div className="flex items-center justify-between border-t pt-4 text-sm text-muted-foreground">
                <div>
                  Page {results.page} of {results.pageCount}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      handleFilterChange({ page: Math.max(1, results.page - 1) }, false)
                    }
                    disabled={results.page === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    onClick={() =>
                      handleFilterChange(
                        { page: Math.min(results.pageCount, results.page + 1) },
                        false,
                      )
                    }
                    disabled={results.page === results.pageCount}
                  >
                    Next
                  </Button>
                </div>
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </TooltipProvider>
  );
}

type ProblemCardProps = {
  problem: ProblemListItem;
  isFetching: boolean;
  index: number;
  animationOrder?: number;
  onFocusRequest: (index: number) => void;
  onOpen: (slug: string) => void;
};

const ProblemCard = forwardRef<HTMLDivElement, ProblemCardProps>(function ProblemCard(
  { problem, isFetching, index, animationOrder = 0, onFocusRequest, onOpen },
  ref,
) {
  const acceptance =
    typeof problem.acceptanceRate === "number" ? problem.acceptanceRate * 100 : null;
  const showRestTags = problem.tags.length > 3;
  const visibleTags = problem.tags.slice(0, 3);
  const lastSubmissionLabel = problem.lastSubmissionAt
    ? `${formatDistanceToNow(new Date(problem.lastSubmissionAt), { addSuffix: true })}`
    : null;
  const titleId = `problem-title-${problem.id}`;

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      onFocusRequest(index + 1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      onFocusRequest(index - 1);
    } else if (event.key === "Enter") {
      event.preventDefault();
      onOpen(problem.slug);
    }
  };
  const animationDelay = Math.min(animationOrder, 5) * 20;

  return (
    <div
      ref={ref}
      role="listitem"
      tabIndex={0}
      aria-labelledby={titleId}
      onKeyDown={handleKeyDown}
      className={cn(
        "group rounded-2xl border border-border/50 bg-card/90 p-5 shadow-sm backdrop-blur-sm transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary/40",
        "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:duration-200",
        "hover:-translate-y-1 hover:border-primary/30 hover:bg-card hover:shadow-lg hover:shadow-primary/5",
        isFetching && "opacity-75",
      )}
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-3">
            <Link
              href={`/problems/${problem.slug}`}
              id={titleId}
              className="text-base font-semibold leading-tight transition-colors group-hover:text-primary"
            >
              {problem.title}
            </Link>
            {problem.version ? (
              <span className="text-xs text-muted-foreground">v{problem.version}</span>
            ) : null}
            <Badge
              variant="outline"
              className={cn(
                "border text-xs",
                difficultyTone[problem.difficulty ?? ""] ?? "text-muted-foreground",
              )}
            >
              {problem.difficulty ?? "UNRATED"}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {visibleTags.map((tag) => (
              <Badge
                key={tag.slug}
                variant="secondary"
                className="rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors hover:bg-secondary/80"
              >
                {tag.name}
              </Badge>
            ))}
            {showRestTags ? <span>+{problem.tags.length - visibleTags.length} more</span> : null}
            {problem.hasEditorial ? (
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary ring-1 ring-primary/20">
                Editorial
              </span>
            ) : null}
          </div>
        </div>
        <ProblemStatusBadge status={problem.status} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <span>Acceptance</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex h-[2px] w-28 overflow-hidden rounded-full bg-muted">
                <div
                  className="bg-primary transition-[width] duration-200"
                  style={{ width: `${acceptance ?? 0}%` }}
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              {acceptance ? `${acceptance.toFixed(1)}%` : "Not enough data"}
            </TooltipContent>
          </Tooltip>
        </div>
        <Separator orientation="vertical" className="hidden h-5 lg:block" />
        <div>Submissions: {problem.submissionCount}</div>
        {lastSubmissionLabel ? (
          <div className="flex items-center gap-1.5">
            <Clock01Icon className="h-4 w-4" strokeWidth={2} aria-hidden />
            Last attempt {lastSubmissionLabel}
          </div>
        ) : null}
        <div className="ml-auto flex items-center gap-1">
          <Link
            href={`/problems/${problem.slug}`}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary transition-colors hover:text-primary/80"
            aria-label={`View ${problem.title}`}
          >
            View problem <ArrowRight01Icon className="h-4 w-4" strokeWidth={2.5} />
          </Link>
        </div>
      </div>
    </div>
  );
});

function ProblemListSkeleton() {
  return (
    <div className="space-y-3" aria-hidden="true">
      {Array.from({ length: 6 }).map((_, index) => (
        <Skeleton key={index} className="h-32 rounded-2xl" />
      ))}
    </div>
  );
}

function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div
      className="rounded-2xl border-2 border-dashed border-border bg-card/50 p-12 text-center backdrop-blur-sm"
      role="status"
      aria-live="polite"
    >
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <Search01Icon className="h-8 w-8 text-muted-foreground" strokeWidth={2} />
      </div>
      <p className="text-lg font-semibold text-foreground">No problems found</p>
      <p className="mt-2 text-sm text-muted-foreground">
        Try adjusting your search criteria or clearing some filters to see more results.
      </p>
      <Button className="mt-6" onClick={onReset} variant="default" size="sm">
        <Cancel01Icon className="mr-2 h-4 w-4" strokeWidth={2} />
        Reset all filters
      </Button>
    </div>
  );
}
