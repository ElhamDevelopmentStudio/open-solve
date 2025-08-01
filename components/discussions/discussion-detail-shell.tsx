"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

import { DiscussionComposer } from "@/components/discussions/discussion-composer";
import { DiscussionReplyItem } from "@/components/discussions/discussion-reply";
import { DiscussionReportButton } from "@/components/discussions/discussion-report-button";
import { DiscussionVoteToggle } from "@/components/discussions/discussion-vote-toggle";
import { SpoilerBlock } from "@/components/discussions/spoiler-block";
import { LoaderCircle, AlertTriangle, MessageSquareText, ArrowRight } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { discussionsConfig } from "@/config/discussions";
import { trpc } from "@/lib/trpc/client";

type DiscussionDetailShellProps = {
  threadId: string;
};

export function DiscussionDetailShell({ threadId }: DiscussionDetailShellProps) {
  const { thread: config } = discussionsConfig;

  const threadQuery = trpc.discussions.thread.useQuery({ id: threadId });
  const repliesQuery = trpc.discussions.replies.useInfiniteQuery(
    { threadId },
    { getNextPageParam: (last) => last.nextCursor ?? undefined },
  );

  if (threadQuery.isLoading) {
    return (
      <div className="flex items-center justify-center border-2 border-border bg-background p-16 font-mono text-sm text-muted-foreground">
        <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
        Loading thread...
      </div>
    );
  }

  const thread = threadQuery.data;
  if (!thread) {
    return (
      <div className="border-2 border-dashed border-border bg-background p-16 text-center">
        <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
        <p className="font-mono text-sm text-muted-foreground">Thread unavailable or hidden</p>
      </div>
    );
  }

  const replies = repliesQuery.data?.pages.flatMap((page) => page.items) ?? [];
  const createdMeta = formatDistanceToNow(thread.createdAt, { addSuffix: true });
  const viewerVote = (thread.viewer?.vote ?? 0) as -1 | 0 | 1;

  return (
    <div className="space-y-6">
      <article className="border-2 border-border bg-background p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="inline-flex items-center gap-2 border border-border bg-background px-2 py-1 font-mono text-xs font-bold uppercase tracking-wider text-primary/80">
            <MessageSquareText className="h-3.5 w-3.5" />
            {config.badge}
          </div>
          <div className="flex items-center gap-2">
            <DiscussionVoteToggle
              discussionId={thread.id}
              initialScore={thread.score}
              initialVote={viewerVote}
            />
            <DiscussionReportButton discussionId={thread.id} />
          </div>
        </div>

        <div className="mb-6 space-y-3">
          <h1 className="font-mono text-2xl font-black leading-tight sm:text-3xl">
            {thread.title ?? "Discussion"}
          </h1>
          <div className="flex flex-wrap items-center gap-3 font-mono text-xs text-muted-foreground">
            <span className="font-bold text-foreground">@{thread.author.handle}</span>
            <span>{createdMeta}</span>
            {thread.problem && (
              <Badge variant="outline" className="rounded-none border font-mono text-xs uppercase">
                {thread.problem.title} · {thread.problem.difficulty ?? "Unrated"}
              </Badge>
            )}
            {thread.category && (
              <Badge
                variant="secondary"
                className="rounded-none border border-primary/30 bg-primary/10 font-mono text-[10px] font-bold uppercase tracking-wider text-primary"
              >
                {thread.category.toLowerCase()}
              </Badge>
            )}
          </div>
        </div>

        <Separator className="my-6" />

        <div className="font-mono text-sm leading-relaxed text-muted-foreground">
          {thread.containsSpoiler ? (
            <SpoilerBlock>
              <p className="whitespace-pre-line">{thread.content}</p>
            </SpoilerBlock>
          ) : (
            <p className="whitespace-pre-line">{thread.content}</p>
          )}
        </div>

        {thread.problem && (
          <div className="mt-6">
            <Button
              asChild
              variant="outline"
              className="h-10 gap-2 rounded-none border-2 border-border font-mono text-xs font-bold uppercase hover:border-primary/50"
            >
              <Link href={`/problems/${thread.problem.slug}/discuss/${thread.id}`}>
                {config.actions.viewProblem}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        )}
      </article>

      <section className="space-y-4">
        <div className="border-2 border-border bg-background p-4">
          <div className="flex items-center justify-between">
            <div className="font-mono text-xs font-bold uppercase tracking-wider text-primary/80">
              [03] {config.meta.replies}
            </div>
            <Badge variant="secondary" className="rounded-none border font-mono text-xs font-bold">
              {replies.length}
            </Badge>
          </div>
        </div>

        {replies.length === 0 ? (
          <div className="border-2 border-dashed border-border bg-background p-12 text-center">
            <p className="font-mono text-sm text-muted-foreground">{config.empty.replies}</p>
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              {config.empty.description}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {replies.map((reply) => (
              <DiscussionReplyItem key={reply.id} reply={reply} />
            ))}
            {repliesQuery.hasNextPage && (
              <Button
                variant="outline"
                disabled={repliesQuery.isFetchingNextPage}
                onClick={() => repliesQuery.fetchNextPage()}
                className="h-10 w-full rounded-none border-2 border-border font-mono text-xs font-bold uppercase hover:border-primary/50"
              >
                {repliesQuery.isFetchingNextPage ? (
                  <>
                    <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  "Load more replies"
                )}
              </Button>
            )}
          </div>
        )}
      </section>

      <section className="border-2 border-border bg-background p-6">
        <div className="mb-4 font-mono text-xs font-bold uppercase tracking-wider text-primary/80">
          [04] Post your reply
        </div>
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
