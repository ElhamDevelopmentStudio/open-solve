import { HydrationBoundary } from "@tanstack/react-query";
import { buildHydrationState, prefetchTrpcQuery } from "@/lib/react-query/server";
import { createTRPCCaller } from "@/lib/trpc/server/caller";
import { StaffContestDashboard } from "@/components/staff/contests/staff-contest-dashboard";

export const dynamic = "force-dynamic";

export default async function StaffContestsPage() {
  const caller = await createTRPCCaller();
  const state = await buildHydrationState([
    prefetchTrpcQuery("staff.contests.list", () => caller.staff.contests.list()),
  ]);

  return (
    <HydrationBoundary state={state}>
      <StaffContestDashboard />
    </HydrationBoundary>
  );
}
