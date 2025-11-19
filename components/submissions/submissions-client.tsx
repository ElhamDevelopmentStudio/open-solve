"use client";

import { SubmissionStatusBadge } from "@/components/submissions/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
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
  ArrowUpRight,
  CalendarRange,
  ChevronsUpDown,
  Filter,
  RefreshCw,
  RotateCcw,
  Search,
  Star,
} from "@/components/icons";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

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
      (entries) => {
        const first = entries[0];
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
      <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-6 text-sm text-destructive dark:text-destructive-foreground">
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card/80 p-6 shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase text-muted-foreground">Track progress</p>
            <h1 className="text-2xl font-bold text-foreground">My submissions</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={resetFilters} className="gap-2">
              <RotateCcw className="h-4 w-4" />
              Reset filters
            </Button>
            <Button variant="secondary" size="sm" asChild>
              <Link href={problemBasePath}>
                <ArrowUpRight className="mr-2 h-4 w-4" />
                Browse problems
              </Link>
            </Button>
          </div>
        </div>
        <SubmissionStats summary={summary} />
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

      <div className="rounded-2xl border border-border bg-card/70">
        {entries.length === 0 ? (
          <EmptyState problemBasePath={problemBasePath} />
        ) : (
          <div className="divide-y divide-border/70">
            {entries.map((entry) => (
              <SubmissionRow key={entry.id} entry={entry} />
            ))}
          </div>
        )}
        <div ref={fetchMoreRef} className="h-12" />
        {listQuery.isFetchingNextPage ? (
          <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            Loading more submissions…
          </div>
        ) : null}
        {!hasNextPage && entries.length > 0 ? (
          <div className="flex justify-center border-t border-border/80 bg-muted/5 py-4">
            <Button
              variant="ghost"
              size="sm"
              className="gap-2"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            >
              Back to top
            </Button>
          </div>
        ) : null}
      </div>
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
    <div className="flex flex-wrap items-center gap-3">
      {lockedProblemSlug ? (
        <Badge variant="outline" className="px-4 py-2 text-sm">
          Problem: {lockedProblemTitle ?? lockedProblemSlug}
        </Badge>
      ) : (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="w-48 justify-between">
              <span className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                {selectedProblem ? selectedProblem.title : "All problems"}
              </span>
              <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-0" align="start">
            <Command>
              <CommandInput
                value={problemSearch}
                onValueChange={setProblemSearch}
                placeholder="Search problems"
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

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="h-4 w-4" />
            Verdicts
            {selectedVerdicts.length ? (
              <Badge variant="secondary" className="ml-1">
                {selectedVerdicts.length}
              </Badge>
            ) : null}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="start">
          <DropdownMenuLabel>Verdict</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {SUBMISSION_VERDICTS.map((code) => (
            <DropdownMenuCheckboxItem
              key={code}
              checked={selectedVerdicts.includes(code)}
              onCheckedChange={(checked) => handleArrayToggle("verdicts", code, checked)}
            >
              {renderVerdictLabel(code)}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            Status
            {selectedStatuses.length ? (
              <Badge variant="secondary" className="ml-1">
                {selectedStatuses.length}
              </Badge>
            ) : null}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-48" align="start">
          <DropdownMenuLabel>Lifecycle</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {SUBMISSION_STATUSES.map((status) => (
            <DropdownMenuCheckboxItem
              key={status}
              checked={selectedStatuses.includes(status)}
              onCheckedChange={(checked) => handleArrayToggle("statuses", status, checked)}
            >
              {status}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            Languages
            {selectedLanguages.length ? (
              <Badge variant="secondary" className="ml-1">
                {selectedLanguages.length}
              </Badge>
            ) : null}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-48" align="start">
          <DropdownMenuLabel>Languages</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {filterMetadata.languages.map((language) => (
            <DropdownMenuCheckboxItem
              key={language.code}
              checked={selectedLanguages.includes(language.code)}
              onCheckedChange={(checked) => handleArrayToggle("languages", language.code, checked)}
            >
              {language.displayName ?? language.code}{" "}
              <span className="ml-auto text-xs text-muted-foreground">({language.usageCount})</span>
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <CalendarRange className="h-4 w-4" />
            {selectedFrom || selectedTo ? (
              <span>
                {selectedFrom ? format(selectedFrom, "MMM d") : "…"} –{" "}
                {selectedTo ? format(selectedTo, "MMM d") : "…"}
              </span>
            ) : (
              "Date range"
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-0">
          <Calendar
            mode="range"
            numberOfMonths={2}
            selected={{ from: selectedFrom, to: selectedTo }}
            onSelect={handleDateRange}
          />
        </PopoverContent>
      </Popover>

      <SelectControl
        label="Contest"
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
        label="Sort"
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
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        className="flex h-9 items-center rounded-md border border-border bg-background px-3 text-sm"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function SubmissionRow({ entry }: { entry: SubmissionListEntry }) {
  return (
    <div className="flex flex-col gap-2 px-5 py-4 transition hover:bg-muted/30 sm:flex-row sm:items-center sm:gap-6">
      <div className="flex-grow space-y-1">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <SubmissionStatusBadge verdict={entry.verdictCode} status={entry.status} size="sm" />
          <span>{entry.languageDisplayName ?? entry.languageCode}</span>
          {entry.firstAccepted ? (
            <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
              <Star className="h-3 w-3" />
              First AC
            </span>
          ) : null}
          {entry.contest ? (
            <Badge variant="outline" className="border-purple-400 text-purple-500">
              Contest
            </Badge>
          ) : null}
        </div>
        <Link
          href={`/submissions/${entry.id}`}
          className="text-base font-semibold text-foreground transition hover:text-primary"
        >
          {entry.problem.title}
        </Link>
        <div className="text-sm text-muted-foreground">
          {new Date(entry.createdAt).toLocaleString()} •{" "}
          {entry.runtimeMs ? `${entry.runtimeMs} ms` : "—"} /{" "}
          {entry.memoryKb ? `${entry.memoryKb} kb` : "—"}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/submissions/${entry.id}`}>Open</Link>
        </Button>
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/problems/${entry.problem.slug}`}>Problem</Link>
        </Button>
      </div>
    </div>
  );
}

function SubmissionStats({ summary }: { summary: SubmissionListSummary | null }) {
  if (!summary) return null;
  const cards = [
    { label: "Total attempts", value: summary.totalAttempts },
    { label: "Accepted", value: summary.acceptedAttempts },
    { label: "Solved problems", value: summary.solvedProblems },
    { label: "Manual pending", value: summary.manualPending },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label} className="p-4">
          <p className="text-xs uppercase text-muted-foreground">{card.label}</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{card.value}</p>
        </Card>
      ))}
    </div>
  );
}

function EmptyState({ problemBasePath }: { problemBasePath: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <p className="text-lg font-semibold text-foreground">No submissions yet</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        Choose a problem to start solving. Your attempts, verdicts, and resubmits will appear here
        so you can trace your progress over time.
      </p>
      <Button asChild>
        <Link href={problemBasePath}>
          <ArrowUpRight className="mr-2 h-4 w-4" />
          Browse problems
        </Link>
      </Button>
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
