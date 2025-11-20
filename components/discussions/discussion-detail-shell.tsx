"use client";

import { trpc } from "@/lib/trpc/client";
import { DiscussionVoteToggle } from "@/components/discussions/discussion-vote-toggle";
import { DiscussionReplyItem } from "@/components/discussions/discussion-reply";
import { DiscussionComposer } from "@/components/discussions/discussion-composer";
import { DiscussionReportButton } from "@/components/discussions/discussion-report-button";
import { SpoilerBlock } from "@/components/discussions/spoiler-block";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { LoaderCircle } from "@/components/icons";

type DiscussionDetailShellProps = {
  threadId: string;
};

export function DiscussionDetailShell({ threadId }: DiscussionDetailShellProps) {
  const threadQuery = trpc.discussions.thread.useQuery({ id: threadId });
  const repliesQuery = trpc.discussions.replies.useInfiniteQuery(
    { threadId },
    { getNextPageParam: (last) => last.nextCursor ?? undefined },
  );
  if (threadQuery.isLoading) {
    return (
      <div className="flex items-center justify-center rounded-3xl border border-border/60 bg-card/70 p-12 text-sm text-muted-foreground">
        <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> Loading thread…
      </div>
    );
  }
  const thread = threadQuery.data;
  if (!thread) {
    return (
      <div className="rounded-3xl border border-dashed border-border/60 bg-muted/10 p-12 text-center text-sm text-muted-foreground">
        Thread unavailable or hidden.
      </div>
    );
  }
  const replies = repliesQuery.data?.pages.flatMap((page) => page.items) ?? [];
  const createdMeta = formatDistanceToNow(thread.createdAt, { addSuffix: true });

  const viewerVote = (thread.viewer?.vote ?? 0) as -1 | 0 | 1;

  return (
    <div className="space-y-6">
      <article className="rounded-3xl border border-border/70 bg-card/80 p-6">
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex-1">
            <p className="text-xs uppercase text-muted-foreground">Thread</p>
            <h1 className="text-2xl font-semibold">{thread.title ?? "Discussion"}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span>@{thread.author.handle}</span>
              <span>{createdMeta}</span>
              {thread.problem ? (
                <Badge variant="outline" className="text-xs">
                  {thread.problem.title} · {thread.problem.difficulty ?? "Unrated"}
                </Badge>
              ) : null}
              {thread.category ? (
                <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                  {thread.category.toLowerCase()}
                </Badge>
              ) : null}
            </div>
          </div>
          <DiscussionVoteToggle
            discussionId={thread.id}
            initialScore={thread.score}
            initialVote={viewerVote}
          />
          <DiscussionReportButton discussionId={thread.id} />
        </div>
        <Separator className="my-4" />
        {thread.containsSpoiler ? (
          <SpoilerBlock>
            <p className="whitespace-pre-line text-sm text-muted-foreground">{thread.content}</p>
          </SpoilerBlock>
        ) : (
          <p className="whitespace-pre-line text-sm text-muted-foreground">{thread.content}</p>
        )}
        {thread.problem ? (
          <div className="mt-6">
            <Button asChild>
              <Link href={`/problems/${thread.problem.slug}/discuss/${thread.id}`}>
                View in problem context
              </Link>
            </Button>
          </div>
        ) : null}
      </article>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase text-muted-foreground">Replies</h2>
        {replies.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
            No replies yet.
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
        )}
      </section>

      <section className="rounded-3xl border border-border/70 bg-card/70 p-4">
        <DiscussionComposer
          mode="reply"
          threadId={thread.id}
          parentId={thread.id}
          onSubmitted={() => repliesQuery.refetch()}
        />
      </section>
    </div>
  );
}
