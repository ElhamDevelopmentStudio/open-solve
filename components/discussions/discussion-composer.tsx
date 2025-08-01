"use client";

import Link from "next/link";
import { startTransition, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Send, AlertCircle } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { discussionsConfig } from "@/config/discussions";
import { trpc } from "@/lib/trpc/client";

type DiscussionComposerProps = {
  mode: "thread" | "reply";
  problemId?: string;
  threadId?: string;
  parentId?: string;
  category?: "trending" | "latest" | "help" | "meta";
  onSubmitted?: () => void;
};

export function DiscussionComposer({
  mode,
  problemId,
  threadId,
  parentId,
  category,
  onSubmitted,
}: DiscussionComposerProps) {
  const { thread: config, categories } = discussionsConfig;

  const utils = trpc.useUtils();
  const sessionQuery = trpc.auth.getSession.useQuery(undefined, { staleTime: 30_000 });
  const isAuthenticated = Boolean(sessionQuery.data?.user);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [spoiler, setSpoiler] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(category ?? "trending");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!problemId && category && category !== selectedCategory) {
      startTransition(() => setSelectedCategory(category));
    }
  }, [category, problemId, selectedCategory]);

  const createThread = trpc.discussions.createThread.useMutation({
    onSuccess: () => {
      toast.success("Thread posted");
      setTitle("");
      setContent("");
      setSpoiler(false);
      void utils.discussions.listByProblem.invalidate();
      void utils.discussions.listGlobal.invalidate();
      onSubmitted?.();
    },
    onError: (error) => toast.error(error.message ?? "Unable to create thread"),
    onSettled: () => setIsSubmitting(false),
  });

  const replyMutation = trpc.discussions.reply.useMutation({
    onSuccess: () => {
      toast.success("Reply posted");
      setContent("");
      setSpoiler(false);
      void utils.discussions.replies.invalidate({ threadId: threadId! });
      void utils.discussions.thread.invalidate({ id: threadId! });
      onSubmitted?.();
    },
    onError: (error) => toast.error(error.message ?? "Unable to reply"),
    onSettled: () => setIsSubmitting(false),
  });

  const canSubmit = useMemo(() => {
    if (mode === "thread") {
      const titleReady = title.trim().length >= 4;
      const bodyReady = content.trim().length >= 10;
      const scopeReady = Boolean(problemId) || Boolean(selectedCategory);
      return titleReady && bodyReady && scopeReady;
    }
    return content.trim().length >= 2;
  }, [mode, problemId, title, content, selectedCategory]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit || isSubmitting) return;
    setIsSubmitting(true);
    if (mode === "thread") {
      createThread.mutate({
        problemId,
        title: title.trim(),
        content,
        containsSpoiler: spoiler,
        category: problemId ? undefined : selectedCategory,
      });
    } else if (threadId) {
      replyMutation.mutate({
        threadId,
        parentId,
        content,
        containsSpoiler: spoiler,
      });
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="border-2 border-dashed border-border bg-background p-8 text-center">
        <AlertCircle className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
        <p className="mb-4 font-mono text-sm text-muted-foreground">{config.auth.description}</p>
        <Button
          asChild
          className="h-10 rounded-none border-2 border-primary bg-primary font-mono text-xs font-bold uppercase"
        >
          <Link href="/sign-in">{config.auth.action}</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {mode === "thread" ? (
        <>
          <div className="space-y-2">
            <Label htmlFor="thread-title" className="font-mono text-xs font-bold uppercase">
              {config.composer.thread.title}
            </Label>
            <Input
              id="thread-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="What would you like to discuss?"
              required
              className="h-11 rounded-none border-2 border-border font-mono text-sm transition-colors focus:border-primary"
            />
          </div>
          {!problemId && (
            <div className="space-y-2">
              <Label
                htmlFor="discussion-category"
                className="font-mono text-xs font-bold uppercase"
              >
                {config.composer.thread.category}
              </Label>
              <Select
                value={selectedCategory}
                onValueChange={(value) => setSelectedCategory(value as typeof selectedCategory)}
              >
                <SelectTrigger
                  id="discussion-category"
                  className="h-11 rounded-none border-2 border-border font-mono text-sm"
                >
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent className="rounded-none border-2 border-border">
                  {categories.map((option) => (
                    <SelectItem
                      key={option.value}
                      value={option.value}
                      className="font-mono text-sm"
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="thread-content" className="font-mono text-xs font-bold uppercase">
          {mode === "thread" ? "Content" : "Reply"}
        </Label>
        <Textarea
          id="thread-content"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder={
            mode === "thread" ? config.composer.thread.content : config.composer.reply.content
          }
          rows={mode === "thread" ? 8 : 4}
          className="rounded-none border-2 border-border font-mono text-sm transition-colors focus:border-primary"
        />
      </div>

      <div className="flex items-center justify-between gap-4 border-t border-border pt-4">
        <label className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
          <Switch checked={spoiler} onCheckedChange={setSpoiler} />
          {mode === "thread" ? config.composer.thread.spoiler : config.composer.reply.spoiler}
        </label>
        <Button
          type="submit"
          disabled={!canSubmit || isSubmitting}
          className="h-10 gap-2 rounded-none border-2 border-primary bg-primary font-mono text-xs font-bold uppercase shadow-sm shadow-primary/20 transition-all hover:shadow-md hover:shadow-primary/30"
        >
          {isSubmitting ? (
            "Posting..."
          ) : (
            <>
              {mode === "thread" ? config.composer.thread.submit : config.composer.reply.submit}
              <Send className="h-3.5 w-3.5" />
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
