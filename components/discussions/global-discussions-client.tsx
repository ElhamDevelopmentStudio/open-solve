"use client";

import { useMemo } from "react";
import { useQueryState, parseAsStringLiteral } from "nuqs";
import { trpc } from "@/lib/trpc/client";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DiscussionThreadCard } from "@/components/discussions/discussion-thread-card";
import { DiscussionComposer } from "@/components/discussions/discussion-composer";
import { LoaderCircle, Filter } from "lucide-react";
import Link from "next/link";

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

export function GlobalDiscussionsClient({ tagOptions, difficultyOptions }: GlobalDiscussionsClientProps) {
  const [tab, setTab] = useQueryState(
    "tab",
    parseAsStringLiteral(["trending", "latest", "help", "meta"]).withDefault("trending"),
  );
  const [tagParam, setTagParam] = useQueryState("tags", { defaultValue: "" });
  const [difficultyParam, setDifficultyParam] = useQueryState("difficulty", { defaultValue: "" });
  const selectedTags = useMemo(() => (tagParam ? tagParam.split(",").filter(Boolean) : []), [tagParam]);
  const selectedDifficulty = useMemo(() => (difficultyParam ? difficultyParam.split(",").filter(Boolean) : []), [difficultyParam]);

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
      <section className="space-y-4 rounded-3xl border border-border/70 bg-card/80 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase text-muted-foreground">Start a topic</p>
            <h1 className="text-2xl font-semibold">Community discussions</h1>
          </div>
          <Button variant="ghost" size="sm" className="gap-2" onClick={resetFilters}>
            Reset filters
          </Button>
        </div>
        <DiscussionComposer
          mode="thread"
          category={tab as "trending" | "latest" | "help" | "meta"}
          onSubmitted={() => listQuery.refetch()}
        />
      </section>

      <section className="space-y-4">
        <Tabs value={tab} onValueChange={(value) => setTab(value as "trending" | "latest" | "help" | "meta")}>
          <TabsList className="grid grid-cols-4">
            {tabOptions.map((option) => (
              <TabsTrigger key={option.value} value={option.value}>
                {option.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="flex flex-wrap items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Filter className="h-4 w-4" /> Tags
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              <DropdownMenuLabel>Popular tags</DropdownMenuLabel>
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
              <Button variant="outline" size="sm">Difficulty</Button>
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
            <Badge key={slug} variant="secondary" className="cursor-pointer" onClick={() => toggleTag(slug)}>
              #{slug}
            </Badge>
          ))}
          {selectedDifficulty.map((value) => (
            <Badge key={value} variant="outline" className="cursor-pointer" onClick={() => toggleDifficulty(value)}>
              {value}
            </Badge>
          ))}
        </div>
      </section>

      {listQuery.isLoading ? (
        <div className="flex items-center justify-center rounded-3xl border border-border/60 bg-card/70 p-12 text-sm text-muted-foreground">
          <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> Loading threads…
        </div>
      ) : threads.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border/60 bg-muted/10 p-12 text-center text-sm text-muted-foreground">
          No discussions yet. Start the conversation above.
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
              className="w-full"
              variant="outline"
              disabled={listQuery.isFetchingNextPage}
              onClick={() => listQuery.fetchNextPage()}
            >
              {listQuery.isFetchingNextPage ? "Loading…" : "Load more"}
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
}
