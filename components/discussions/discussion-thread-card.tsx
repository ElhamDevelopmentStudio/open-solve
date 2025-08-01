"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { useCallback, type KeyboardEvent, type MouseEvent } from "react";

import { DiscussionVoteToggle } from "@/components/discussions/discussion-vote-toggle";
import { MessageSquare, User } from "@/components/icons";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DiscussionThread } from "@/lib/discussions/types";

type DiscussionThreadCardProps = {
  thread: DiscussionThread;
  href?: string;
  onSelect?: () => void;
  active?: boolean;
};

export function DiscussionThreadCard({
  thread,
  href,
  onSelect,
  active = false,
}: DiscussionThreadCardProps) {
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
        "group border-2 border-border bg-background p-4 transition-all hover:border-primary/50 hover:bg-accent",
        active && "border-primary bg-primary/5",
        selectable &&
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
      )}
      role={selectable ? "button" : undefined}
      tabIndex={selectable ? 0 : undefined}
      aria-pressed={selectable ? active : undefined}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
    >
      <div className="flex items-start gap-4">
        <Avatar className="h-10 w-10 rounded-none border border-border">
          <AvatarFallback className="rounded-none bg-primary/10 font-mono text-xs font-bold uppercase text-primary">
            <User className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-muted-foreground">
            <span className="font-bold text-foreground">@{thread.author.handle}</span>
            <span>{meta}</span>
            {thread.category && (
              <Badge
                variant="outline"
                className="ml-auto rounded-none border font-mono text-[10px] font-bold uppercase"
              >
                {thread.category.toLowerCase()}
              </Badge>
            )}
          </div>

          <div className="space-y-2">
            <h3 className="font-mono text-base font-bold leading-tight line-clamp-2">
              {thread.title ?? "Discussion"}
            </h3>
            {thread.problem && (
              <Badge
                variant="outline"
                className="rounded-none border font-mono text-[11px] uppercase"
              >
                {thread.problem.title} · {thread.problem.difficulty ?? "Unrated"}
              </Badge>
            )}
          </div>

          <p className="font-mono text-sm text-muted-foreground line-clamp-3">{thread.content}</p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
        <DiscussionVoteToggle
          discussionId={thread.id}
          initialScore={thread.score}
          initialVote={(thread.viewer?.vote ?? 0) as -1 | 0 | 1}
          size="sm"
        />
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
            <MessageSquare className="h-3.5 w-3.5" />
            {thread.replyCount}
          </span>
          {href ? (
            <Button
              asChild
              size="sm"
              variant="ghost"
              className="h-8 rounded-none font-mono text-xs hover:bg-primary/10 hover:text-primary"
            >
              <Link href={href} onClick={handleSelect}>
                Open
              </Link>
            </Button>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              type="button"
              onClick={handleSelect}
              className="h-8 rounded-none font-mono text-xs hover:bg-primary/10 hover:text-primary"
            >
              Open
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
