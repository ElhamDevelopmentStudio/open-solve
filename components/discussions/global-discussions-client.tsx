"use client";

import { parseAsStringLiteral, useQueryState } from "nuqs";
import { useMemo } from "react";

import { DiscussionComposer } from "@/components/discussions/discussion-composer";
import { DiscussionThreadCard } from "@/components/discussions/discussion-thread-card";
import { AlertTriangle, Filter, LoaderCircle, XIcon } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { discussionsConfig } from "@/config/discussions";
import { trpc } from "@/lib/trpc/client";

type GlobalDiscussionsClientProps = {
  tagOptions: Array<{ slug: string; name: string }>;
  difficultyOptions: string[];
};

export function GlobalDiscussionsClient({
  tagOptions,
  difficultyOptions,
}: GlobalDiscussionsClientProps) {
  const { global } = discussionsConfig;

  const [tab, setTab] = useQueryState(
    "tab",
    parseAsStringLiteral(["trending", "latest", "help", "meta"]).withDefault("trending"),
  );
  const [tagParam, setTagParam] = useQueryState("tags", { defaultValue: "" });
  const [difficultyParam, setDifficultyParam] = useQueryState("difficulty", { defaultValue: "" });
  const selectedTags = useMemo(
    () => (tagParam ? tagParam.split(",").filter(Boolean) : []),
    [tagParam],
  );
  const selectedDifficulty = useMemo(
    () => (difficultyParam ? difficultyParam.split(",").filter(Boolean) : []),
    [difficultyParam],
  );

  const toggleTag = (slug: string) => {
    const next = selectedTags.includes(slug)
      ? selectedTags.filter((entry) => entry !== slug)
      : [...selectedTags, slug];
    setTagParam(next.length ? next.join(",") : null);
  };
  const toggleDifficulty = (code: string) => {
    const next = selectedDifficulty.includes(code)
      ? selectedDifficulty.filter((entry) => entry !== code)
      : [...selectedDifficulty, code];
    setDifficultyParam(next.length ? next.join(",") : null);
  };

  const listQuery = trpc.discussions.listGlobal.useInfiniteQuery(
    {
      tab: tab as "trending" | "latest" | "help" | "meta",
      tags: selectedTags.length > 0 ? selectedTags : undefined,
      difficulty: selectedDifficulty.length > 0 ? selectedDifficulty : undefined,
    },
    {
      getNextPageParam: (last) => last.nextCursor ?? undefined,
    },
  );
  const threads = listQuery.data?.pages.flatMap((page) => page.items) ?? [];

  const resetFilters = () => {
    setTagParam(null);
    setDifficultyParam(null);
  };

  const hasActiveFilters = selectedTags.length > 0 || selectedDifficulty.length > 0;

  return (
    <div className="space-y-6">
      <section className="border-2 border-border bg-background p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="font-mono text-xs font-bold uppercase tracking-wider text-primary/80">
            [01] {global.composer.title}
          </div>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="h-8 gap-2 rounded-none border border-border font-mono text-xs hover:border-primary/50 hover:bg-accent"
            >
              <XIcon className="h-3.5 w-3.5" />
              {global.filters.reset}
            </Button>
          )}
        </div>
        <DiscussionComposer
          mode="thread"
          category={tab as "trending" | "latest" | "help" | "meta"}
          onSubmitted={() => listQuery.refetch()}
        />
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between border-2 border-border bg-background p-4">
          <div className="font-mono text-xs font-bold uppercase tracking-wider text-primary/80">
            [02] Filter discussions
          </div>
        </div>

        <div className="grid grid-cols-2 gap-px border-2 border-border bg-border sm:grid-cols-4">
          {global.tabs.map((tabOption) => (
            <button
              key={tabOption.value}
              onClick={() => setTab(tabOption.value as typeof tab)}
              className={`border-none bg-background p-4 font-mono text-sm font-bold uppercase tracking-wide transition-colors hover:bg-accent ${
                tab === tabOption.value
                  ? "bg-primary/5 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tabOption.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-2 rounded-none border-2 border-border font-mono text-xs hover:border-primary/50"
              >
                <Filter className="h-3.5 w-3.5" />
                {global.filters.tags}
                {selectedTags.length > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-1 rounded-none border border-primary/30 bg-primary/10 px-1.5 font-mono text-[10px] font-bold text-primary"
                  >
                    {selectedTags.length}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 rounded-none border-2 border-border">
              <DropdownMenuLabel className="font-mono text-xs font-bold uppercase">
                Popular Tags
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {tagOptions.slice(0, 12).map((tag) => (
                <DropdownMenuCheckboxItem
                  key={tag.slug}
                  checked={selectedTags.includes(tag.slug)}
                  onCheckedChange={() => toggleTag(tag.slug)}
                  className="font-mono text-xs"
                >
                  {tag.name}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-9 rounded-none border-2 border-border font-mono text-xs hover:border-primary/50"
              >
                {global.filters.difficulty}
                {selectedDifficulty.length > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-2 rounded-none border border-primary/30 bg-primary/10 px-1.5 font-mono text-[10px] font-bold text-primary"
                  >
                    {selectedDifficulty.length}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="rounded-none border-2 border-border">
              <DropdownMenuLabel className="font-mono text-xs font-bold uppercase">
                Difficulty
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {difficultyOptions.map((difficulty) => (
                <DropdownMenuCheckboxItem
                  key={difficulty}
                  checked={selectedDifficulty.includes(difficulty)}
                  onCheckedChange={() => toggleDifficulty(difficulty)}
                  className="font-mono text-xs"
                >
                  {difficulty}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {selectedTags.map((slug) => (
            <Badge
              key={slug}
              variant="secondary"
              onClick={() => toggleTag(slug)}
              className="cursor-pointer rounded-none border border-border bg-background font-mono text-xs hover:border-destructive hover:bg-destructive/5"
            >
              #{slug}
              <XIcon className="ml-1 h-3 w-3" />
            </Badge>
          ))}
          {selectedDifficulty.map((value) => (
            <Badge
              key={value}
              variant="outline"
              onClick={() => toggleDifficulty(value)}
              className="cursor-pointer rounded-none border-2 border-border font-mono text-xs hover:border-destructive hover:bg-destructive/5"
            >
              {value}
              <XIcon className="ml-1 h-3 w-3" />
            </Badge>
          ))}
        </div>
      </section>

      {listQuery.isLoading ? (
        <div className="flex items-center justify-center border-2 border-border bg-background p-16 font-mono text-sm text-muted-foreground">
          <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
          Loading discussions...
        </div>
      ) : listQuery.isError ? (
        <div className="border-2 border-destructive/50 bg-destructive/5 p-6">
          <div className="mb-2 flex items-center gap-2 font-mono text-sm font-bold text-destructive">
            <AlertTriangle className="h-4 w-4" />
            Failed to load discussions
          </div>
          <p className="mb-4 font-mono text-xs text-muted-foreground">
            {listQuery.error?.message ?? "Please refresh and try again."}
          </p>
          <Button
            onClick={() => listQuery.refetch()}
            className="h-9 rounded-none border-2 border-primary bg-primary font-mono text-xs font-bold"
          >
            Retry
          </Button>
        </div>
      ) : threads.length === 0 ? (
        <div className="border-2 border-dashed border-border bg-background p-16 text-center">
          <p className="mb-2 font-mono text-sm font-bold text-muted-foreground">
            {global.empty.headline}
          </p>
          <p className="font-mono text-xs text-muted-foreground">{global.empty.description}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {threads.map((thread) => {
            const href = thread.problem
              ? `/problems/${thread.problem.slug}/discuss/${thread.id}`
              : `/discuss/${thread.id}`;
            return <DiscussionThreadCard key={thread.id} thread={thread} href={href} />;
          })}
          {listQuery.hasNextPage && (
            <Button
              variant="outline"
              disabled={listQuery.isFetchingNextPage}
              onClick={() => listQuery.fetchNextPage()}
              className="h-11 w-full rounded-none border-2 border-border font-mono text-sm font-bold uppercase hover:border-primary/50"
            >
              {listQuery.isFetchingNextPage ? (
                <>
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                "Load more discussions"
              )}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
