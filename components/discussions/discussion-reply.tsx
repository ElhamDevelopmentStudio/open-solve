"use client";

import type { DiscussionReply } from "@/lib/discussions/types";
import { DiscussionVoteToggle } from "@/components/discussions/discussion-vote-toggle";
import { SpoilerBlock } from "@/components/discussions/spoiler-block";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { DiscussionReportButton } from "@/components/discussions/discussion-report-button";

type DiscussionReplyProps = {
  reply: DiscussionReply;
  onReply?: (replyId: string) => void;
};

export function DiscussionReplyItem({ reply, onReply }: DiscussionReplyProps) {
  const meta = formatDistanceToNow(reply.createdAt, { addSuffix: true });
  const content = reply.containsSpoiler ? (
    <SpoilerBlock>
      <p className="text-sm text-muted-foreground whitespace-pre-line">{reply.content}</p>
    </SpoilerBlock>
  ) : (
    <p className="text-sm text-muted-foreground whitespace-pre-line">{reply.content}</p>
  );
  return (
    <div className="rounded-2xl border border-border/60 bg-card/70 p-4">
      <div className="flex items-start gap-3">
        <Avatar className="h-8 w-8">
          <AvatarFallback>{reply.author.handle.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">@{reply.author.handle}</span>
            <span>{meta}</span>
          </div>
          {content}
          <div className="flex items-center justify-between">
            <DiscussionVoteToggle
              discussionId={reply.id}
              initialScore={reply.score}
              initialVote={(reply.viewer?.vote ?? 0) as -1 | 0 | 1}
              size="sm"
            />
            <div className="flex items-center gap-2">
              {onReply ? (
                <Button variant="ghost" size="sm" onClick={() => onReply(reply.id)}>
                  Reply
                </Button>
              ) : null}
              <DiscussionReportButton discussionId={reply.id} />
            </div>
          </div>
        </div>
      </div>
      {reply.replies && reply.replies.length > 0 ? (
        <div className="mt-3 space-y-3 border-l border-border/40 pl-4">
          {reply.replies.map((child) => (
            <DiscussionReplyItem key={child.id} reply={child} onReply={onReply} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
