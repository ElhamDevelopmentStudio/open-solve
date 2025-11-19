import { StaffProposalsDashboard } from "@/components/staff/proposals/proposals-dashboard";
import { buildHydrationState, prefetchTrpcQuery } from "@/lib/react-query/server";
import { HydrationBoundary } from "@tanstack/react-query";
import { createTRPCCaller } from "@/lib/trpc/server/caller";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function StaffProposalsPage() {
  const session = await getSession();
  if (!session || (session.user.role !== "PROBLEM_CURATOR" && session.user.role !== "ADMIN")) {
    redirect("/staff");
  }
  const caller = await createTRPCCaller();
  const state = await buildHydrationState([
    prefetchTrpcQuery("proposals.staffList", () => caller.proposals.staffList(undefined), {
      input: undefined,
    }),
  ]);

  return (
    <HydrationBoundary state={state}>
      <StaffProposalsDashboard />
    </HydrationBoundary>
  );
}
