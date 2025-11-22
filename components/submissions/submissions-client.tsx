"use client";

import { submissionsConfig } from "@/config/submissions";
import { SubmissionStatusBadge } from "@/components/submissions/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSubmissionFilters } from "@/hooks/use-submission-filters";
import { SUBMISSION_STATUSES } from "@/lib/problems/constants";
import { submissionListQueryOptions } from "@/lib/react-query/policies";
import {
  SUBMISSION_CONTEST_FILTERS,
  SUBMISSION_LIST_SORTS,
  SUBMISSION_VERDICTS,
} from "@/lib/submissions/constants";
import {
  buildSubmissionListInputFromParams,
  type SubmissionListInputDTO,
} from "@/lib/submissions/filter-utils";
import type { SubmissionSearchParams } from "@/lib/submissions/search-params";
import type {
  SubmissionFilterMetadata,
  SubmissionListEntry,
  SubmissionListSummary,
} from "@/lib/submissions/types";
import { trpc } from "@/lib/trpc/client";
import type { AppRouter } from "@/lib/trpc/router";
import { stableHash } from "@/lib/utils/stable-hash";
import type { InfiniteData } from "@tanstack/react-query";
import type { inferRouterOutputs } from "@trpc/server";
import { format } from "date-fns";
import {
  CalendarRange,
  ChevronsUpDown,
  Filter as FilterIcon,
  RefreshCcw,
  Search,
  Star,
} from "@/components/icons";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

type RouterOutput = inferRouterOutputs<AppRouter>;
type SubmissionListResponse = RouterOutput["submissions"]["listMine"];

type SubmissionsClientProps = {
  initialInput: SubmissionListInputDTO;
  initialData: SubmissionListResponse;
  filterMetadata: SubmissionFilterMetadata;
  lockedProblemSlug?: string;
  lockedProblemTitle?: string;
  problemBasePath?: string;
};

const listingConfig = submissionsConfig.listing;
const submissionIcons = submissionsConfig.icons;
const SecondaryHeroIcon = listingConfig.hero.secondaryCta.icon;
const EmptyIcon = submissionIcons.empty;

export function SubmissionsClient({
  initialInput,
  initialData,
  filterMetadata,
  lockedProblemSlug,
  lockedProblemTitle,
  problemBasePath = "/workspace/problems",
}: SubmissionsClientProps) {
  const [filterState, setFilterState] = useSubmissionFilters();
  useEffect(() => {
    if (lockedProblemSlug && filterState.problem !== lockedProblemSlug) {
      void setFilterState({ problem: lockedProblemSlug });
    }
  }, [lockedProblemSlug, filterState.problem, setFilterState]);

  const filterSnapshot = useMemo(
    () =>
      lockedProblemSlug
        ? ({ ...filterState, problem: lockedProblemSlug } as SubmissionSearchParams)
        : (filterState as SubmissionSearchParams),
    [filterState, lockedProblemSlug],
  );

  const listInput = useMemo(
    () => buildSubmissionListInputFromParams(filterSnapshot),
    [filterSnapshot],
  );
  const [initialHash] = useState(() => stableHash(initialInput));
  const currentHash = stableHash(listInput);
  const initialQueryData: InfiniteData<SubmissionListResponse, string | undefined> | undefined =
    initialHash === currentHash
      ? {
          pages: [initialData],
          pageParams: [undefined],
        }
      : undefined;

  const [problemSearch, setProblemSearch] = useState("");
  const problemOptions = useMemo(() => {
    if (!problemSearch.trim()) return filterMetadata.problems;
    return filterMetadata.problems.filter((problem) =>
      problem.title.toLowerCase().includes(problemSearch.toLowerCase()),
    );
  }, [filterMetadata.problems, problemSearch]);

  const listQuery = trpc.submissions.listMine.useInfiniteQuery(listInput, {
    ...submissionListQueryOptions,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialData: initialQueryData,
  });

  const entries = listQuery.data?.pages.flatMap((page) => page.items) ?? initialData.items;
  const summary = listQuery.data?.pages[0]?.summary ?? initialData.summary;
  const hasNextPage = Boolean(listQuery.hasNextPage);
  const fetchMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!fetchMoreRef.current) return;
    if (!hasNextPage) return;
    const node = fetchMoreRef.current;
    const observer = new IntersectionObserver(
      (observed) => {
        const first = observed[0];
        if (first?.isIntersecting) {
          listQuery.fetchNextPage();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasNextPage, listQuery]);

  if (listQuery.isError) {
    return (
      <div className="border-2 border-destructive/40 bg-destructive/10 p-6 font-mono text-sm text-destructive">
        Failed to load submissions: {listQuery.error.message}
      </div>
    );
  }

  const resetFilters = () => {
    setFilterState({
      problem: "",
      verdicts: [],
      statuses: [],
      languages: [],
      contest: "all",
      sort: "recent",
      from: "",
      to: "",
    });
  };

  const stats = buildSummaryStats(summary);

  return (
    <div className="space-y-12 font-mono text-foreground">
      <section className="border-2 border-border bg-card p-6 md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.35em] text-primary/70">
              {listingConfig.hero.marker}
              <span className="inline-flex items-center gap-2 border border-border px-3 py-1 text-[10px] tracking-[0.25em] text-muted-foreground">
                <span className="h-2 w-2 animate-pulse bg-primary" />
                {listingConfig.hero.badge}
              </span>
            </div>
            <h1 className="text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
              {listingConfig.hero.headline.line1}
              <br />
              {listingConfig.hero.headline.line2}
              <br />
              <span className="bg-linear-to-r from-primary via-primary to-primary/70 bg-clip-text text-transparent">
                {listingConfig.hero.headline.line3}
              </span>
            </h1>
            <p className="max-w-3xl text-base text-muted-foreground">
              {listingConfig.hero.description}
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild className="h-12 px-6 text-base font-bold">
                <Link href={listingConfig.hero.primaryCta.href}>
                  {listingConfig.hero.primaryCta.label}
                </Link>
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-12 px-6 text-base font-bold"
                onClick={resetFilters}
              >
                <SecondaryHeroIcon className="mr-2 h-4 w-4" />
                {listingConfig.hero.secondaryCta.label}
              </Button>
            </div>
          </div>
          <div className="w-full max-w-sm border-2 border-border bg-background p-5">
            <div className="text-xs font-bold uppercase text-muted-foreground">Summary</div>
            <div className="mt-4 grid gap-3">
              {stats.map((stat) => (
                <div key={stat.label} className="border border-border bg-card px-4 py-3">
                  <p className="text-[11px] uppercase text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-black">{stat.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeader
          marker={listingConfig.filters.marker}
          title={listingConfig.filters.title}
          description={listingConfig.filters.description}
        />
        <div className="border-2 border-border bg-card p-6">
          <SubmissionFilters
            filterState={filterState}
            setFilterState={setFilterState}
            filterMetadata={filterMetadata}
            problemOptions={problemOptions}
            problemSearch={problemSearch}
            setProblemSearch={setProblemSearch}
            lockedProblemSlug={lockedProblemSlug}
            lockedProblemTitle={lockedProblemTitle}
          />
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeader
          marker={listingConfig.list.marker}
          title={listingConfig.list.title}
          description={listingConfig.list.description}
        />
        <div className="border-2 border-border bg-card">
          {entries.length === 0 ? (
            <EmptyState problemBasePath={problemBasePath} />
          ) : (
            <div className="divide-y-2 divide-border">
              {entries.map((entry) => (
                <SubmissionRow key={entry.id} entry={entry} />
              ))}
            </div>
          )}
          <div ref={fetchMoreRef} className="h-12" />
          {listQuery.isFetchingNextPage ? (
            <div className="flex items-center justify-center border-t-2 border-border py-4 text-xs uppercase text-muted-foreground">
              <RefreshCcw className="mr-2 h-4 w-4 animate-spin" />
              {listingConfig.list.loadingLabel}
            </div>
          ) : null}
          {!hasNextPage && entries.length > 0 ? (
            <div className="flex justify-center border-t-2 border-border bg-accent/20 py-4">
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 text-xs font-bold uppercase"
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              >
                {listingConfig.list.backToTop}
              </Button>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function SubmissionFilters({
  filterState,
  setFilterState,
  filterMetadata,
  problemOptions,
  problemSearch,
  setProblemSearch,
  lockedProblemSlug,
  lockedProblemTitle,
}: {
  filterState: SubmissionSearchParams;
  setFilterState: ReturnType<typeof useSubmissionFilters>[1];
  filterMetadata: SubmissionFilterMetadata;
  problemOptions: SubmissionFilterMetadata["problems"];
  problemSearch: string;
  setProblemSearch: (value: string) => void;
  lockedProblemSlug?: string;
  lockedProblemTitle?: string;
}) {
  const selectedVerdicts = filterState.verdicts;
  const selectedStatuses = filterState.statuses;
  const selectedLanguages = filterState.languages;
  const selectedProblem =
    filterMetadata.problems.find((p) => p.slug === filterState.problem) ?? null;

  const handleArrayToggle = (
    key: keyof SubmissionSearchParams,
    value: string,
    checked: boolean,
  ) => {
    const current = (filterState[key] as string[]) ?? [];
    const next = checked ? [...current, value] : current.filter((item) => item !== value);
    void setFilterState({
      [key]: next,
    } as Partial<SubmissionSearchParams>);
  };

  const handleDateRange = (range: { from?: Date; to?: Date } | undefined) => {
    void setFilterState({
      from: range?.from ? format(range.from, "yyyy-MM-dd") : "",
      to: range?.to ? format(range.to, "yyyy-MM-dd") : "",
    });
  };

  const selectedFrom = filterState.from ? new Date(filterState.from) : undefined;
  const selectedTo = filterState.to ? new Date(filterState.to) : undefined;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        {lockedProblemSlug ? (
          <Badge variant="outline" className="border-2 border-border px-3 py-2 text-xs font-bold">
            {listingConfig.filters.lockedProblemLabel}: {lockedProblemTitle ?? lockedProblemSlug}
          </Badge>
        ) : (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-11 min-w-60 justify-between border-2 border-border"
              >
                <span className="flex items-center gap-2 text-sm font-bold uppercase">
                  <Search className="h-4 w-4" />
                  {selectedProblem ? selectedProblem.title : listingConfig.filters.problemLabel}
                </span>
                <ChevronsUpDown className="h-3.5 w-3.5 opacity-60" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-80 rounded-none border-2 border-border bg-background p-0"
              align="start"
            >
              <Command className="rounded-none border-none">
                <CommandInput
                  value={problemSearch}
                  onValueChange={setProblemSearch}
                  placeholder="Search problems"
                  className="rounded-none"
                />
                <CommandList>
                  <CommandEmpty>No matches found.</CommandEmpty>
                  <CommandGroup heading="My attempts">
                    <CommandItem
                      value="__all__"
                      onSelect={() => {
                        void setFilterState({ problem: "" });
                        setProblemSearch("");
                      }}
                    >
                      All problems
                    </CommandItem>
                    <ScrollArea className="max-h-64">
                      {problemOptions.map((problem) => (
                        <CommandItem
                          key={problem.id}
                          value={problem.slug}
                          onSelect={() => {
                            void setFilterState({ problem: problem.slug });
                          }}
                        >
                          {problem.title}
                        </CommandItem>
                      ))}
                    </ScrollArea>
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        )}

        <FilterDropdown
          triggerLabel={listingConfig.filters.verdictLabel}
          icon={<FilterIcon className="h-4 w-4" />}
          count={selectedVerdicts.length}
        >
          <DropdownMenuLabel>{listingConfig.filters.verdictLabel}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {SUBMISSION_VERDICTS.map((code) => (
            <DropdownMenuCheckboxItem
              key={code}
              className="font-mono"
              checked={selectedVerdicts.includes(code)}
              onCheckedChange={(checked) => handleArrayToggle("verdicts", code, checked)}
            >
              {renderVerdictLabel(code)}
            </DropdownMenuCheckboxItem>
          ))}
        </FilterDropdown>

        <FilterDropdown
          triggerLabel={listingConfig.filters.statusLabel}
          count={selectedStatuses.length}
        >
          <DropdownMenuLabel>{listingConfig.filters.statusLabel}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {SUBMISSION_STATUSES.map((status) => (
            <DropdownMenuCheckboxItem
              key={status}
              className="font-mono uppercase"
              checked={selectedStatuses.includes(status)}
              onCheckedChange={(checked) => handleArrayToggle("statuses", status, checked)}
            >
              {status}
            </DropdownMenuCheckboxItem>
          ))}
        </FilterDropdown>

        <FilterDropdown
          triggerLabel={listingConfig.filters.languageLabel}
          count={selectedLanguages.length}
        >
          <DropdownMenuLabel>{listingConfig.filters.languageLabel}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {filterMetadata.languages.map((language) => (
            <DropdownMenuCheckboxItem
              key={language.code}
              className="font-mono"
              checked={selectedLanguages.includes(language.code)}
              onCheckedChange={(checked) => handleArrayToggle("languages", language.code, checked)}
            >
              {language.displayName ?? language.code}
              <span className="ml-auto text-xs text-muted-foreground">({language.usageCount})</span>
            </DropdownMenuCheckboxItem>
          ))}
        </FilterDropdown>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-11 gap-2 border-2 border-border">
              <CalendarRange className="h-4 w-4" />
              {selectedFrom || selectedTo ? (
                <span className="text-xs font-bold uppercase">
                  {selectedFrom ? format(selectedFrom, "MMM d") : "…"}–
                  {selectedTo ? format(selectedTo, "MMM d") : "…"}
                </span>
              ) : (
                listingConfig.filters.rangeLabel
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="rounded-none border-2 border-border bg-background p-2"
          >
            <Calendar
              mode="range"
              numberOfMonths={2}
              selected={{ from: selectedFrom, to: selectedTo }}
              onSelect={handleDateRange}
            />
          </PopoverContent>
        </Popover>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <SelectControl
          label={listingConfig.filters.contestLabel}
          value={filterState.contest}
          options={SUBMISSION_CONTEST_FILTERS.map((value) => ({
            label:
              value === "all"
                ? "All attempts"
                : value === "contest"
                  ? "Contest only"
                  : "Practice only",
            value,
          }))}
          onValueChange={(value) =>
            setFilterState({
              contest: value as typeof filterState.contest,
            })
          }
        />
        <SelectControl
          label={listingConfig.filters.sortLabel}
          value={filterState.sort}
          options={SUBMISSION_LIST_SORTS.map((value) => ({
            label:
              value === "recent"
                ? "Newest first"
                : value === "fastest"
                  ? "Fastest runtime"
                  : value === "memory"
                    ? "Lowest memory"
                    : "First AC",
            value,
          }))}
          onValueChange={(value) =>
            setFilterState({
              sort: value as typeof filterState.sort,
            })
          }
        />
      </div>
    </div>
  );
}

function FilterDropdown({
  triggerLabel,
  icon,
  count,
  children,
}: {
  triggerLabel: string;
  icon?: ReactNode;
  count: number;
  children: ReactNode;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-11 gap-2 border-2 border-border">
          {icon}
          {triggerLabel}
          {count ? (
            <Badge
              variant="secondary"
              className="ml-1 border border-border/40 bg-accent px-2 text-[10px] font-bold"
            >
              {count}
            </Badge>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-56 rounded-none border-2 border-border bg-background p-2"
        align="start"
      >
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SelectControl({
  label,
  value,
  options,
  onValueChange,
}: {
  label: string;
  value: string;
  options: Array<{ label: string; value: string }>;
  onValueChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-2 text-xs font-bold uppercase text-muted-foreground">
      {label}
      <select
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        className="h-11 border-2 border-border bg-background px-4 text-sm font-mono uppercase outline-none"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function SubmissionRow({ entry }: { entry: SubmissionListEntry }) {
  return (
    <article className="grid gap-4 px-5 py-4 transition hover:bg-accent/20 md:grid-cols-[1fr_auto] md:items-center">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase text-muted-foreground">
          <SubmissionStatusBadge verdict={entry.verdictCode} status={entry.status} size="sm" />
          <span>{entry.languageDisplayName ?? entry.languageCode}</span>
          {entry.firstAccepted ? (
            <span className="inline-flex items-center gap-1 text-primary">
              <Star className="h-3 w-3" />
              {listingConfig.list.firstAcLabel}
            </span>
          ) : null}
          {entry.contest ? (
            <Badge variant="outline" className="text-[10px] uppercase">
              {listingConfig.list.contestBadge}
            </Badge>
          ) : null}
        </div>
        <Link
          href={`/submissions/${entry.id}`}
          className="text-xl font-bold uppercase tracking-tight hover:text-primary"
        >
          {entry.problem.title}
        </Link>
        <div className="text-xs uppercase text-muted-foreground">
          {new Date(entry.createdAt).toLocaleString()} · {listingConfig.list.latencyLabel}:{" "}
          {entry.runtimeMs ? `${entry.runtimeMs} ms` : "—"} · {listingConfig.list.memoryLabel}:{" "}
          {entry.memoryKb ? `${entry.memoryKb} kb` : "—"}
        </div>
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          variant="default"
          size="sm"
          asChild
          className="h-10 px-4 text-xs font-bold uppercase"
        >
          <Link href={`/submissions/${entry.id}`}>{listingConfig.list.openLabel}</Link>
        </Button>
        <Button
          variant="outline"
          size="sm"
          asChild
          className="h-10 px-4 text-xs font-bold uppercase"
        >
          <Link href={`/problems/${entry.problem.slug}`}>{listingConfig.list.problemLabel}</Link>
        </Button>
      </div>
    </article>
  );
}

function EmptyState({ problemBasePath }: { problemBasePath: string }) {
  return (
    <div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
      <EmptyIcon className="h-10 w-10 text-muted-foreground" />
      <p className="text-lg font-bold uppercase">{listingConfig.list.empty.title}</p>
      <p className="max-w-xl text-sm text-muted-foreground">
        {listingConfig.list.empty.description}
      </p>
      <Button asChild variant="outline" className="px-6">
        <Link href={problemBasePath}>{listingConfig.list.empty.actionLabel}</Link>
      </Button>
    </div>
  );
}

function buildSummaryStats(summary: SubmissionListSummary | null) {
  if (!summary) {
    return listingConfig.stats.map((stat) => ({ label: stat.label, value: "—" }));
  }
  const map: Record<(typeof listingConfig.stats)[number]["key"], number> = {
    total: summary.totalAttempts,
    accepted: summary.acceptedAttempts,
    solved: summary.solvedProblems,
    manual: summary.manualPending,
  };
  return listingConfig.stats.map((stat) => ({ label: stat.label, value: map[stat.key] }));
}

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
      <p className="text-xs font-bold uppercase tracking-[0.35em] text-primary/70">{marker}</p>
      <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <h2 className="text-3xl font-black tracking-tight">{title}</h2>
        {description ? (
          <p className="text-sm text-muted-foreground lg:max-w-2xl">{description}</p>
        ) : null}
      </div>
    </div>
  );
}

function renderVerdictLabel(code: string) {
  switch (code) {
    case "AC":
      return "Accepted";
    case "WA":
      return "Wrong answer";
    case "TLE":
      return "Time limit";
    case "MLE":
      return "Memory limit";
    case "RE":
      return "Runtime error";
    case "CE":
      return "Compile error";
    case "MANUAL_ACCEPTED":
      return "Manual accepted";
    case "MANUAL_REJECTED":
      return "Manual rejected";
    case "MANUAL_PARTIAL":
      return "Manual partial";
    case "MANUAL_PENDING":
      return "Manual pending";
    default:
      return code;
  }
}
