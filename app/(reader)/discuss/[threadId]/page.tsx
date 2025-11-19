import { HydrationBoundary } from "@tanstack/react-query";
import { createTRPCCaller } from "@/lib/trpc/server/caller";
import { buildHydrationState, prefetchTrpcQuery } from "@/lib/react-query/server";
import { DiscussionDetailShell } from "@/components/discussions/discussion-detail-shell";
import { notFound } from "next/navigation";

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
    <div className="py-10">
      <HydrationBoundary state={hydration}>
        <DiscussionDetailShell threadId={threadId} />
      </HydrationBoundary>
    </div>
  );
}
