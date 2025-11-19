"use client";

import { DiscussionComposer } from "@/components/discussions/discussion-composer";
import { DiscussionThreadCard } from "@/components/discussions/discussion-thread-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc/client";
import { Filter, LoaderCircle } from "@/components/icons";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { useMemo } from "react";

type GlobalDiscussionsClientProps = {
  tagOptions: Array<{ slug: string; name: string }>;
  difficultyOptions: string[];
};

const tabOptions = [
  { value: "trending", label: "Trending" },
  { value: "latest", label: "Latest" },
  { value: "help", label: "Help" },
  { value: "meta", label: "Meta" },
];

export function GlobalDiscussionsClient({
  tagOptions,
  difficultyOptions,
}: GlobalDiscussionsClientProps) {
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

  return (
    <div className="space-y-8">
      <section className="premium-card space-y-5 rounded-2xl p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Start a Topic
            </p>
            <h2 className="text-2xl font-semibold">Community Discussions</h2>
          </div>
          <Button variant="ghost" size="sm" className="gap-2 rounded-xl" onClick={resetFilters}>
            <Filter className="h-4 w-4" />
            Reset Filters
          </Button>
        </div>
        <DiscussionComposer
          mode="thread"
          category={tab as "trending" | "latest" | "help" | "meta"}
          onSubmitted={() => listQuery.refetch()}
        />
      </section>

      <section className="space-y-5">
        <Tabs
          value={tab}
          onValueChange={(value) => setTab(value as "trending" | "latest" | "help" | "meta")}
        >
          <TabsList className="grid w-full grid-cols-4 rounded-xl">
            {tabOptions.map((option) => (
              <TabsTrigger key={option.value} value={option.value} className="rounded-lg">
                {option.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="flex flex-wrap items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 rounded-xl">
                <Filter className="h-4 w-4" /> Tags
                {selectedTags.length > 0 ? (
                  <Badge variant="secondary" className="ml-1 h-5 rounded-full px-1.5 text-[10px]">
                    {selectedTags.length}
                  </Badge>
                ) : null}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              <DropdownMenuLabel>Popular Tags</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {tagOptions.slice(0, 12).map((tag) => (
                <DropdownMenuCheckboxItem
                  key={tag.slug}
                  checked={selectedTags.includes(tag.slug)}
                  onCheckedChange={() => toggleTag(tag.slug)}
                >
                  {tag.name}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="rounded-xl">
                Difficulty
                {selectedDifficulty.length > 0 ? (
                  <Badge variant="secondary" className="ml-2 h-5 rounded-full px-1.5 text-[10px]">
                    {selectedDifficulty.length}
                  </Badge>
                ) : null}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Difficulty</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {difficultyOptions.map((difficulty) => (
                <DropdownMenuCheckboxItem
                  key={difficulty}
                  checked={selectedDifficulty.includes(difficulty)}
                  onCheckedChange={() => toggleDifficulty(difficulty)}
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
              className="cursor-pointer rounded-full"
              onClick={() => toggleTag(slug)}
            >
              #{slug}
            </Badge>
          ))}
          {selectedDifficulty.map((value) => (
            <Badge
              key={value}
              variant="outline"
              className="cursor-pointer rounded-full"
              onClick={() => toggleDifficulty(value)}
            >
              {value}
            </Badge>
          ))}
        </div>
      </section>

      {listQuery.isLoading ? (
        <div className="premium-card flex items-center justify-center rounded-2xl p-16 text-sm text-muted-foreground">
          <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> Loading discussions…
        </div>
      ) : listQuery.isError ? (
        <Alert variant="destructive">
          <AlertTitle>Failed to load discussions</AlertTitle>
          <AlertDescription className="flex flex-col gap-2">
            {listQuery.error?.message ?? "Please refresh and try again."}
            <Button size="sm" onClick={() => listQuery.refetch()}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      ) : threads.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border/60 bg-muted/10 p-16 text-center">
          <p className="text-sm font-medium text-muted-foreground">No discussions yet</p>
          <p className="mt-1 text-xs text-muted-foreground">Start the conversation above</p>
        </div>
      ) : (
        <div className="space-y-4">
          {threads.map((thread) => {
            const href = thread.problem
              ? `/problems/${thread.problem.slug}/discuss/${thread.id}`
              : `/discuss/${thread.id}`;
            return <DiscussionThreadCard key={thread.id} thread={thread} href={href} />;
          })}
          {listQuery.hasNextPage ? (
            <Button
              className="w-full rounded-xl"
              variant="outline"
              disabled={listQuery.isFetchingNextPage}
              onClick={() => listQuery.fetchNextPage()}
            >
              {listQuery.isFetchingNextPage ? (
                <>
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> Loading…
                </>
              ) : (
                "Load More"
              )}
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
}
