import { StaffProposalDetail } from "@/components/staff/proposals/proposal-detail";
import { buildHydrationState, prefetchTrpcQuery } from "@/lib/react-query/server";
import { HydrationBoundary } from "@tanstack/react-query";
import { createTRPCCaller } from "@/lib/trpc/server/caller";

export default async function StaffProposalDetailPage({ params }: { params: { id: string } }) {
  const caller = await createTRPCCaller();
  const state = await buildHydrationState([
    prefetchTrpcQuery("proposals.staffGet", () => caller.proposals.staffGet({ id: params.id }), {
      input: { id: params.id },
    }),
  ]);

  return (
    <HydrationBoundary state={state}>
      <StaffProposalDetail proposalId={params.id} />
    </HydrationBoundary>
  );
}
