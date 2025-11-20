"use client";
import { trpc } from "@/lib/trpc/client";
import type { DiscussionSort } from "@/lib/discussions/types";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { DiscussionThreadCard } from "@/components/discussions/discussion-thread-card";
import { DiscussionVoteToggle } from "@/components/discussions/discussion-vote-toggle";
import { SpoilerBlock } from "@/components/discussions/spoiler-block";
import { DiscussionComposer } from "@/components/discussions/discussion-composer";
import { DiscussionReplyItem } from "@/components/discussions/discussion-reply";
import { DiscussionReportButton } from "@/components/discussions/discussion-report-button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatDistanceToNow } from "date-fns";
import { useMemo } from "react";
import { useQueryState, parseAsStringLiteral } from "nuqs";
import Link from "next/link";
import { LoaderCircle, Plus } from "@/components/icons";

const cuidRegex = /^c[0-9a-z]{24}$/i;
const isCuidLike = (value?: string | null) =>
  typeof value === "string" ? cuidRegex.test(value) : false;

type ProblemDiscussionPanelProps = {
  problem: {
    id: string;
    slug: string;
    title: string;
    difficulty: string | null;
    tags: { slug: string; name: string }[];
    hasEditorial: boolean;
  };
};

export function ProblemDiscussionPanel({ problem }: ProblemDiscussionPanelProps) {
  const [threadParam, setThreadParam] = useQueryState("thread");
  const [sort, setSort] = useQueryState(
    "sort",
    parseAsStringLiteral(["top", "recent", "unanswered"]).withDefault("top"),
  );
  const listQuery = trpc.discussions.listByProblem.useInfiniteQuery(
    { slug: problem.slug, sort: sort ?? "top" },
    {
      getNextPageParam: (last) => last.nextCursor ?? undefined,
    },
  );
  const threads = useMemo(
    () => listQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [listQuery.data],
  );
  const firstValidThreadId = useMemo(
    () => threads.find((thread) => isCuidLike(thread.id))?.id ?? null,
    [threads],
  );
  const activeThreadId = useMemo(() => {
    if (threadParam && isCuidLike(threadParam)) {
      return threadParam;
    }
    return firstValidThreadId;
  }, [threadParam, firstValidThreadId]);
  const threadQuery = trpc.discussions.thread.useQuery(
    { id: activeThreadId ?? "" },
    {
      enabled: Boolean(activeThreadId),
    },
  );
  const repliesQuery = trpc.discussions.replies.useInfiniteQuery(
    { threadId: activeThreadId ?? "" },
    {
      enabled: Boolean(activeThreadId),
      getNextPageParam: (last) => last.nextCursor ?? undefined,
    },
  );
  const thread = threadQuery.data;
  const replies = repliesQuery.data?.pages.flatMap((page) => page.items) ?? [];
  const createdMeta = thread ? formatDistanceToNow(thread.createdAt, { addSuffix: true }) : null;
  const threadVote = (thread?.viewer?.vote ?? 0) as -1 | 0 | 1;
  if (listQuery.isLoading) {
    return (
      <div className="flex items-center justify-center rounded-3xl border border-border/60 bg-card/70 p-10 text-sm text-muted-foreground">
        <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> Loading discussions…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-border/70 bg-card/80 p-6">
        <DiscussionComposer
          mode="thread"
          problemId={problem.id}
          onSubmitted={() => listQuery.refetch()}
        />
      </div>
      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)_280px]">
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Threads
            </h2>
            <Button size="icon" variant="ghost" onClick={() => setThreadParam(null)}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <Tabs value={sort ?? "top"} onValueChange={(value) => setSort(value as DiscussionSort)}>
            <TabsList className="grid grid-cols-3">
              <TabsTrigger value="top">Top</TabsTrigger>
              <TabsTrigger value="recent">Recent</TabsTrigger>
              <TabsTrigger value="unanswered">Unanswered</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="space-y-3">
            {threads.map((item) => (
              <DiscussionThreadCard
                key={item.id}
                thread={item}
                href={
                  isCuidLike(item.id)
                    ? `/problems/${problem.slug}/discuss/${item.id}`
                    : `/problems/${problem.slug}/discuss`
                }
                active={item.id === activeThreadId}
                onSelect={() => {
                  if (isCuidLike(item.id)) {
                    setThreadParam(item.id);
                  } else {
                    setThreadParam(null);
                  }
                }}
              />
            ))}
            {listQuery.hasNextPage ? (
              <Button
                variant="ghost"
                className="w-full"
                disabled={listQuery.isFetchingNextPage}
                onClick={() => listQuery.fetchNextPage()}
              >
                {listQuery.isFetchingNextPage ? "Loading…" : "Load more"}
              </Button>
            ) : null}
          </div>
        </section>

        <section className="space-y-4">
          <div className="rounded-3xl border border-border/70 bg-card/80 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase text-muted-foreground">Discussion</p>
                <h2 className="text-xl font-semibold">{thread?.title ?? "Select a thread"}</h2>
                {thread && (
                  <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                    <span>@{thread.author.handle}</span>
                    {createdMeta ? <span>{createdMeta}</span> : null}
                  </div>
                )}
              </div>
              {thread ? (
                <div className="flex items-center gap-2">
                  <DiscussionVoteToggle
                    discussionId={thread.id}
                    initialScore={thread.score}
                    initialVote={threadVote}
                  />
                  <DiscussionReportButton discussionId={thread.id} />
                </div>
              ) : null}
            </div>
            <Separator className="my-4" />
            {thread ? (
              <article className="space-y-4">
                {thread.containsSpoiler ? (
                  <SpoilerBlock>
                    <p className="whitespace-pre-line text-sm text-muted-foreground">
                      {thread.content}
                    </p>
                  </SpoilerBlock>
                ) : (
                  <p className="whitespace-pre-line text-sm text-muted-foreground">
                    {thread.content}
                  </p>
                )}
                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge variant="secondary">{thread.replyCount} replies</Badge>
                  {thread.tags.map((tag) => (
                    <Badge key={tag.slug} variant="outline">
                      #{tag.slug}
                    </Badge>
                  ))}
                </div>
              </article>
            ) : (
              <p className="text-sm text-muted-foreground">Pick a thread to read the discussion.</p>
            )}
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase text-muted-foreground">Replies</h3>
            {thread ? (
              replies.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
                  Be the first to reply.
                </p>
              ) : (
                <div className="space-y-3">
                  {replies.map((reply) => (
                    <DiscussionReplyItem key={reply.id} reply={reply} />
                  ))}
                  {repliesQuery.hasNextPage ? (
                    <Button
                      variant="ghost"
                      className="w-full"
                      disabled={repliesQuery.isFetchingNextPage}
                      onClick={() => repliesQuery.fetchNextPage()}
                    >
                      {repliesQuery.isFetchingNextPage ? "Loading…" : "Load more"}
                    </Button>
                  ) : null}
                </div>
              )
            ) : (
              <p className="rounded-2xl border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
                Select a thread to view replies.
              </p>
            )}
            {thread ? (
              <div className="rounded-2xl border border-border/60 bg-card/70 p-4">
                <DiscussionComposer
                  mode="reply"
                  threadId={thread.id}
                  parentId={thread.id}
                  onSubmitted={() => repliesQuery.refetch()}
                />
              </div>
            ) : null}
          </div>
        </section>

        <section className="space-y-4 rounded-3xl border border-border/70 bg-card/60 p-6">
          <div>
            <p className="text-xs uppercase text-muted-foreground">Problem</p>
            <h3 className="text-base font-semibold">{problem.title}</h3>
            {problem.difficulty ? <Badge className="mt-2">{problem.difficulty}</Badge> : null}
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Tags</p>
            <div className="flex flex-wrap gap-2 text-xs">
              {problem.tags.map((tag) => (
                <Badge key={tag.slug} variant="outline">
                  #{tag.name}
                </Badge>
              ))}
            </div>
          </div>
          {problem.hasEditorial ? (
            <Button variant="secondary" asChild>
              <Link href={`/problems/${problem.slug}/editorial`}>View editorial</Link>
            </Button>
          ) : null}
          <div className="mt-4 space-y-2 text-xs text-muted-foreground">
            <p className="font-semibold uppercase tracking-wide">House rules</p>
            <ul className="list-disc space-y-1 pl-4">
              <li>Share hints, not full solutions.</li>
              <li>Mark spoilers and be respectful.</li>
              <li>Report abuse so moderators can step in.</li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
