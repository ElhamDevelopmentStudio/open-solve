"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";

type DiscussionComposerProps = {
  mode: "thread" | "reply";
  problemId?: string;
  threadId?: string;
  parentId?: string;
  category?: "trending" | "latest" | "help" | "meta";
  onSubmitted?: () => void;
};

const categoryOptions = [
  { value: "trending", label: "General" },
  { value: "help", label: "Help" },
  { value: "meta", label: "Meta" },
];

export function DiscussionComposer({ mode, problemId, threadId, parentId, category, onSubmitted }: DiscussionComposerProps) {
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
      setSelectedCategory(category);
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
      <div className="rounded-2xl border border-dashed border-border/70 p-6 text-sm text-muted-foreground">
        <p>Sign in to join discussions.</p>
        <Button asChild size="sm" className="mt-3">
          <Link href="/sign-in">Sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {mode === "thread" ? (
        <>
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Thread title"
            required
          />
          {!problemId ? (
            <div className="grid gap-2">
              <Label htmlFor="discussion-category">Category</Label>
              <Select value={selectedCategory} onValueChange={(value) => setSelectedCategory(value as typeof selectedCategory)}>
                <SelectTrigger id="discussion-category" className="w-full">
                  <SelectValue placeholder="Select a tab" />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
        </>
      ) : null}
      <Textarea
        value={content}
        onChange={(event) => setContent(event.target.value)}
        placeholder={mode === "thread" ? "Share your question or hint" : "Add a reply"}
        rows={6}
      />
      <div className="flex items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <Switch checked={spoiler} onCheckedChange={setSpoiler} />
          Mark as spoiler
        </label>
        <Button type="submit" disabled={!canSubmit || isSubmitting}>
          {isSubmitting ? "Posting..." : mode === "thread" ? "Start discussion" : "Reply"}
        </Button>
      </div>
    </form>
  );
}
