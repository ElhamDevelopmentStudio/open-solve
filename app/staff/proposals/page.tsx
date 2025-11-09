import { StaffProposalsDashboard } from "@/components/staff/proposals/proposals-dashboard";
import { buildHydrationState, prefetchTrpcQuery } from "@/lib/react-query/server";
import { HydrationBoundary } from "@tanstack/react-query";
import { createTRPCCaller } from "@/lib/trpc/server/caller";

export default async function StaffProposalsPage() {
  const caller = await createTRPCCaller();
  const state = await buildHydrationState([
    prefetchTrpcQuery("proposals.staffList", () => caller.proposals.staffList({})),
  ]);

  return (
    <HydrationBoundary state={state}>
      <StaffProposalsDashboard />
    </HydrationBoundary>
  );
}
