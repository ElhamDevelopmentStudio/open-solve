import { StaffProblemsDashboard } from "@/components/staff/problems/problems-dashboard";
import { buildHydrationState, prefetchTrpcQuery } from "@/lib/react-query/server";
import { HydrationBoundary } from "@tanstack/react-query";
import { createTRPCCaller } from "@/lib/trpc/server/caller";

export default async function StaffProblemsPage() {
  const caller = await createTRPCCaller();
  const state = await buildHydrationState([
    prefetchTrpcQuery("staff.problems.list", () => caller.staff.problems.list({})),
  ]);

  return (
    <HydrationBoundary state={state}>
      <StaffProblemsDashboard />
    </HydrationBoundary>
  );
}
