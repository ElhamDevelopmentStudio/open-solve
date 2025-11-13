"use client";

import Link from "next/link";
import { useCallback, type KeyboardEvent, type MouseEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { DiscussionThread } from "@/lib/discussions/types";
import { DiscussionVoteToggle } from "@/components/discussions/discussion-vote-toggle";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare } from "lucide-react";

type DiscussionThreadCardProps = {
  thread: DiscussionThread;
  href?: string;
  onSelect?: () => void;
  active?: boolean;
};

export function DiscussionThreadCard({ thread, href, onSelect, active = false }: DiscussionThreadCardProps) {
  const meta = `${formatDistanceToNow(thread.createdAt, { addSuffix: true })}`;
  const selectable = Boolean(onSelect);
  const handleSelect = useCallback(() => {
    onSelect?.();
  }, [onSelect]);
  const handleCardClick = (event: MouseEvent<HTMLElement>) => {
    if (!selectable || event.defaultPrevented) {
      return;
    }
    const target = event.target as HTMLElement;
    if (target.closest("a,button")) {
      return;
    }
    handleSelect();
  };
  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (!selectable || event.target !== event.currentTarget) {
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleSelect();
    }
  };
  return (
    <article
      className={cn(
        "group rounded-2xl border border-border/60 bg-card/80 p-4 transition hover:border-primary/40 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1",
        active && "border-primary/60 bg-primary/5",
        selectable && "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/60",
      )}
      role={selectable ? "button" : undefined}
      tabIndex={selectable ? 0 : undefined}
      aria-pressed={selectable ? active : undefined}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
    >
      <div className="flex items-start gap-3">
        <Avatar className="h-9 w-9">
          <AvatarFallback>{thread.author.handle.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium">@{thread.author.handle}</p>
            <span className="text-xs text-muted-foreground">{meta}</span>
            {thread.category ? (
              <Badge variant="outline" className="ml-auto text-xs capitalize">
                {thread.category.toLowerCase()}
              </Badge>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="flex-1 text-base font-semibold leading-tight text-foreground line-clamp-2">
              {thread.title ?? "Discussion"}
            </h3>
            {thread.problem ? (
              <Badge variant="outline" className="text-[11px]">
                {thread.problem.title} · {thread.problem.difficulty ?? "Unrated"}
              </Badge>
            ) : null}
          </div>
          <p className="text-sm text-muted-foreground line-clamp-3">{thread.content}</p>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
        <DiscussionVoteToggle
          discussionId={thread.id}
          initialScore={thread.score}
          initialVote={(thread.viewer?.vote ?? 0) as -1 | 0 | 1}
          size="sm"
        />
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1 text-sm">
            <MessageSquare className="h-4 w-4" />
            {thread.replyCount}
          </span>
          {href ? (
            <Button asChild size="sm" variant="ghost">
              <Link href={href} onClick={handleSelect}>
                Open
              </Link>
            </Button>
          ) : (
            <Button size="sm" variant="ghost" type="button" onClick={handleSelect}>
              Open
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
