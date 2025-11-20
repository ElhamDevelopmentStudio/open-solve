import { HydrationBoundary } from "@tanstack/react-query";
import { redirect } from "next/navigation";

import { StaffProblemsDashboard } from "@/components/staff/problems/problems-dashboard";
import { Badge } from "@/components/ui/badge";
import { staffConfig } from "@/config/staff";
import { getSession } from "@/lib/auth/session";
import { buildHydrationState, prefetchTrpcQuery } from "@/lib/react-query/server";
import { createTRPCCaller } from "@/lib/trpc/server/caller";

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
    <div className="mx-auto max-w-screen-2xl space-y-8 px-4 pb-10 font-mono text-foreground lg:px-10">
      <section className="border-2 border-border bg-card p-6 md:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.35em] text-primary/80">
              {staffConfig.problems.marker}
              <Badge className="rounded-none border-2 border-border bg-background px-3 py-1 text-[10px] tracking-[0.25em] text-muted-foreground">
                {staffConfig.problems.badge}
              </Badge>
            </div>
            <h1 className="text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
              {staffConfig.problems.headline.line1}
              <br />
              {staffConfig.problems.headline.line2}
              <br />
              <span className="bg-gradient-to-r from-primary via-primary to-primary/70 bg-clip-text text-transparent">
                {staffConfig.problems.headline.line3}
              </span>
            </h1>
            <p className="max-w-3xl text-sm text-muted-foreground">
              {staffConfig.problems.description}
            </p>
          </div>
        </div>
      </section>
      <HydrationBoundary state={state}>
        <StaffProblemsDashboard />
      </HydrationBoundary>
    </div>
  );
}
