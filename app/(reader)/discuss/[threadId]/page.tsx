import { HydrationBoundary } from "@tanstack/react-query";
import { notFound } from "next/navigation";

import { DiscussionDetailShell } from "@/components/discussions/discussion-detail-shell";
import { buildHydrationState, prefetchTrpcQuery } from "@/lib/react-query/server";
import { createTRPCCaller } from "@/lib/trpc/server/caller";

type Params = { threadId: string };

export default async function GlobalThreadDetailPage({
  params,
}: {
  params: Params | Promise<Params>;
}) {
  const { threadId } = await params;
  const caller = await createTRPCCaller();
  const thread = await caller.discussions.thread({ id: threadId }).catch(() => null);
  if (!thread) {
    notFound();
  }
  const hydration = await buildHydrationState([
    prefetchTrpcQuery("discussions.thread", () => caller.discussions.thread({ id: threadId }), {
      input: { id: threadId },
    }),
    prefetchTrpcQuery("discussions.replies", () => caller.discussions.replies({ threadId }), {
      input: { threadId },
    }),
  ]);
  return (
    <HydrationBoundary state={hydration}>
      <DiscussionDetailShell threadId={threadId} />
    </HydrationBoundary>
  );
}
