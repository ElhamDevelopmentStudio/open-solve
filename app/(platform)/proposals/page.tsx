import { ProposalList } from "@/components/proposals/proposal-list";
import { buildHydrationState, prefetchTrpcQuery } from "@/lib/react-query/server";
import { HydrationBoundary } from "@tanstack/react-query";
import { createTRPCCaller } from "@/lib/trpc/server/caller";

export default async function MyProposalsPage() {
  const caller = await createTRPCCaller();
  const state = await buildHydrationState([
    prefetchTrpcQuery("proposals.listMine", () => caller.proposals.listMine()),
  ]);
  return (
    <HydrationBoundary state={state}>
      <ProposalList />
    </HydrationBoundary>
  );
}
