"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { PROBLEM_STATUS_FILTERS } from "@/lib/problems/constants";
import type { ProblemFilterMetadata, ProblemFiltersInput } from "@/lib/trpc/router/problems";
import { cn } from "@/lib/utils";
import { Tick02Icon } from "hugeicons-react";
import { useMemo, useState, type ReactNode } from "react";

const DIFFICULTY_FALLBACK: ProblemFiltersInput["difficulty"] = ["EASY", "MEDIUM", "HARD"];

const STATUS_LABELS: Record<ProblemFiltersInput["status"][number], string> = {
  SOLVED: "Solved",
  ATTEMPTED: "Attempted",
  UNSEEN: "Unseen",
};

const statusTone: Record<ProblemFiltersInput["status"][number], string> = {
  SOLVED: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  ATTEMPTED: "bg-amber-500/10 text-amber-600 dark:text-amber-300",
  UNSEEN: "bg-muted text-muted-foreground",
};

export type ProblemFiltersPanelProps = {
  filters: ProblemFiltersInput;
  metadata?: ProblemFilterMetadata;
  onChange: (patch: Partial<ProblemFiltersInput>) => void;
  onReset: () => void;
  isMobile?: boolean;
  showStatusFilters?: boolean;
};

export function ProblemFiltersPanel({
  filters,
  metadata,
  onChange,
  onReset,
  showStatusFilters = true,
}: ProblemFiltersPanelProps) {
  const [tagQuery, setTagQuery] = useState("");
  const tags = useMemo(() => metadata?.tags ?? [], [metadata?.tags]);
  const filteredTags = useMemo(() => {
    if (!tagQuery) return tags;
    return tags.filter((tag) => tag.name.toLowerCase().includes(tagQuery.toLowerCase()));
  }, [tagQuery, tags]);
  const difficultyOptions = (metadata?.difficulties ??
    DIFFICULTY_FALLBACK) as ProblemFiltersInput["difficulty"];
  const hasActiveFilters =
    Boolean(filters.q) ||
    filters.difficulty.length > 0 ||
    (showStatusFilters && filters.status.length > 0) ||
    filters.tags.length > 0 ||
    filters.onlyWithEditorial;

  const toggleDifficulty = (value: ProblemFiltersInput["difficulty"][number] | null) => {
    onChange({ difficulty: value ? [value] : [] });
  };

  const toggleStatus = (value: ProblemFiltersInput["status"][number]) => {
    if (!showStatusFilters) return;
    const set = new Set(filters.status);
    if (set.has(value)) {
      set.delete(value);
    } else {
      set.add(value);
    }
    onChange({ status: Array.from(set) });
  };

  const toggleTag = (slug: string) => {
    const set = new Set(filters.tags);
    if (set.has(slug)) {
      set.delete(slug);
    } else {
      set.add(slug);
    }
    onChange({ tags: Array.from(set) });
  };

  const difficultyValue = filters.difficulty[0] ?? null;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-mono text-sm font-semibold">Filters</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={onReset}
          className="rounded-none font-mono text-xs"
          disabled={!hasActiveFilters}
        >
          Clear all
        </Button>
      </div>

      <FilterCard title="Difficulty" description="Choose the baseline difficulty.">
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant={difficultyValue ? "outline" : "default"}
            size="sm"
            className="justify-start rounded-none border-2 font-mono"
            onClick={() => toggleDifficulty(null)}
          >
            Any difficulty
          </Button>
          {difficultyOptions.map((difficulty) => (
            <Button
              key={difficulty}
              variant={difficultyValue === difficulty ? "default" : "outline"}
              size="sm"
              className="justify-start rounded-none border-2 font-mono"
              onClick={() => toggleDifficulty(difficulty)}
            >
              {difficulty.charAt(0) + difficulty.slice(1).toLowerCase()}
            </Button>
          ))}
        </div>
      </FilterCard>

      <FilterCard
        title="Status"
        description={
          showStatusFilters
            ? "Filter by your personal progress."
            : "Sign in to track solved and attempted problems."
        }
      >
        {showStatusFilters ? (
          <div className="flex flex-wrap gap-2">
            {PROBLEM_STATUS_FILTERS.map((status) => {
              const active = filters.status.includes(status);
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => toggleStatus(status)}
                  className={cn(
                    "inline-flex items-center rounded-none border-2 px-3 py-1.5 font-mono text-xs font-medium transition-all hover:bg-accent",
                    active
                      ? statusTone[status]
                      : "border-border bg-background text-muted-foreground hover:bg-muted",
                  )}
                >
                  {active && <Tick02Icon className="mr-1.5 h-3.5 w-3.5" strokeWidth={2.5} />}
                  {STATUS_LABELS[status]}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="rounded-none border border-dashed border-border/70 bg-muted/20 px-4 py-3 font-mono text-xs text-muted-foreground">
            Create a free account or sign in from the reader to use progress filters.
          </p>
        )}
      </FilterCard>

      <FilterCard title="Tags" description="Stack multiple topics together.">
        <div className="space-y-2">
          <Input
            placeholder="Search tags"
            value={tagQuery}
            onChange={(event) => setTagQuery(event.target.value)}
            className="h-9 rounded-none border-2 font-mono"
          />
          <ScrollArea className="h-60 rounded-none border-2 border-border">
            <div className="space-y-1 p-2">
              {filteredTags.length === 0 ? (
                <p className="font-mono text-xs text-muted-foreground">No tags found.</p>
              ) : (
                filteredTags.map((tag) => (
                  <label
                    key={tag.slug}
                    className="flex cursor-pointer items-center justify-between rounded-none px-2 py-1 font-mono text-sm hover:bg-muted"
                  >
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={filters.tags.includes(tag.slug)}
                        onCheckedChange={() => toggleTag(tag.slug)}
                        id={`tag-${tag.slug}`}
                      />
                      <span>{tag.name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{tag.problemCount}</span>
                  </label>
                ))
              )}
            </div>
          </ScrollArea>
          {filters.tags.length > 0 ? (
            <Badge variant="secondary" className="rounded-none border font-mono text-[11px]">
              {filters.tags.length} selected
            </Badge>
          ) : null}
        </div>
      </FilterCard>

      <FilterCard title="Editorials" description="Show only problems with official editorials.">
        <div className="flex items-center justify-between gap-3 rounded-none border border-dashed border-border bg-muted/30 px-4 py-3">
          <div className="flex-1">
            <p className="font-mono text-sm font-medium">Only problems with editorials</p>
            <p className="font-mono text-xs text-muted-foreground">Curated solutions included</p>
          </div>
          <Switch
            checked={filters.onlyWithEditorial}
            onCheckedChange={(value) => onChange({ onlyWithEditorial: value })}
            aria-label="Toggle editorial filter"
          />
        </div>
      </FilterCard>

      <Separator />
      <Button variant="outline" onClick={onReset} className="w-full rounded-none border-2 font-mono" disabled={!hasActiveFilters}>
        Reset filters
      </Button>
    </div>
  );
}

function FilterCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="space-y-1">
        <p className="font-mono text-sm font-semibold text-foreground">{title}</p>
        {description ? (
          <p className="font-mono text-xs leading-relaxed text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}
