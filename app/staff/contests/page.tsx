import { HydrationBoundary } from "@tanstack/react-query";
import { buildHydrationState, prefetchTrpcQuery } from "@/lib/react-query/server";
import { createTRPCCaller } from "@/lib/trpc/server/caller";
import { StaffContestDashboard } from "@/components/staff/contests/staff-contest-dashboard";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function StaffContestsPage() {
  const session = await getSession();
  if (!session || session.user.role !== "ADMIN") {
    redirect("/staff");
  }
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
