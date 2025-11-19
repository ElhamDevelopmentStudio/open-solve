import { StaffProblemsDashboard } from "@/components/staff/problems/problems-dashboard";
import { buildHydrationState, prefetchTrpcQuery } from "@/lib/react-query/server";
import { HydrationBoundary } from "@tanstack/react-query";
import { createTRPCCaller } from "@/lib/trpc/server/caller";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function StaffProblemsPage() {
  const session = await getSession();
  if (!session || (session.user.role !== "PROBLEM_CURATOR" && session.user.role !== "ADMIN")) {
    redirect("/staff");
  }
  const caller = await createTRPCCaller();
  const state = await buildHydrationState([
    prefetchTrpcQuery("staff.problems.list", () => caller.staff.problems.list(undefined), {
      input: undefined,
    }),
  ]);

  return (
    <HydrationBoundary state={state}>
      <StaffProblemsDashboard />
    </HydrationBoundary>
  );
}
