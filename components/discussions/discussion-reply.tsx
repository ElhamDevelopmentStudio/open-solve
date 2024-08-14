"use client";

import { formatDistanceToNow } from "date-fns";

import { DiscussionReportButton } from "@/components/discussions/discussion-report-button";
import { DiscussionVoteToggle } from "@/components/discussions/discussion-vote-toggle";
import { SpoilerBlock } from "@/components/discussions/spoiler-block";
import { User, Reply } from "@/components/icons";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { DiscussionReply } from "@/lib/discussions/types";

type DiscussionReplyProps = {
  reply: DiscussionReply;
  onReply?: (replyId: string) => void;
};

export function DiscussionReplyItem({ reply, onReply }: DiscussionReplyProps) {
  const meta = formatDistanceToNow(reply.createdAt, { addSuffix: true });
  const content = reply.containsSpoiler ? (
    <SpoilerBlock>
      <p className="whitespace-pre-line font-mono text-sm text-muted-foreground">{reply.content}</p>
    </SpoilerBlock>
  ) : (
    <p className="whitespace-pre-line font-mono text-sm text-muted-foreground">{reply.content}</p>
  );

  return (
    <div className="border-2 border-border bg-background p-4">
      <div className="flex items-start gap-3">
        <Avatar className="h-9 w-9 rounded-none border border-border">
          <AvatarFallback className="rounded-none bg-primary/10 font-mono text-xs font-bold uppercase text-primary">
            <User className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
            <span className="font-bold text-foreground">@{reply.author.handle}</span>
            <span>{meta}</span>
          </div>
          {content}
          <div className="flex items-center justify-between border-t border-border pt-3">
            <DiscussionVoteToggle
              discussionId={reply.id}
              initialScore={reply.score}
              initialVote={(reply.viewer?.vote ?? 0) as -1 | 0 | 1}
              size="sm"
            />
            <div className="flex items-center gap-2">
              {onReply && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onReply(reply.id)}
                  className="h-8 gap-1.5 rounded-none font-mono text-xs hover:bg-primary/10 hover:text-primary"
                >
                  <Reply className="h-3.5 w-3.5" />
                  Reply
                </Button>
              )}
              <DiscussionReportButton discussionId={reply.id} />
            </div>
          </div>
        </div>
      </div>
      {reply.replies && reply.replies.length > 0 ? (
        <div className="mt-4 space-y-4 border-l-2 border-border/40 pl-4">
          {reply.replies.map((child) => (
            <DiscussionReplyItem key={child.id} reply={child} onReply={onReply} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
