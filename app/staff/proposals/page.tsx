import { StaffProposalsDashboard } from "@/components/staff/proposals/proposals-dashboard";
import { buildHydrationState, prefetchTrpcQuery } from "@/lib/react-query/server";
import { HydrationBoundary } from "@tanstack/react-query";
import { createTRPCCaller } from "@/lib/trpc/server/caller";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { staffConfig } from "@/config/staff";
import { Badge } from "@/components/ui/badge";

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
    <div className="mx-auto max-w-screen-2xl space-y-8 px-4 pb-10 font-mono text-foreground lg:px-10">
      <section className="border-2 border-border bg-card p-6 shadow-sm shadow-primary/20 md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.3em] text-primary/80">
              {staffConfig.proposals.marker}
              <Badge className="rounded-none border-2 border-border bg-background px-3 py-1 text-[10px] tracking-[0.25em] text-muted-foreground">
                {staffConfig.proposals.badge}
              </Badge>
            </div>
            <h1 className="text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
              {staffConfig.proposals.headline.line1}
              <br />
              {staffConfig.proposals.headline.line2}
              <br />
              <span className="bg-gradient-to-r from-primary via-primary to-primary/70 bg-clip-text text-transparent">
                {staffConfig.proposals.headline.line3}
              </span>
            </h1>
            <p className="max-w-3xl text-sm text-muted-foreground">
              {staffConfig.proposals.description}
            </p>
          </div>
        </div>
      </section>
      <HydrationBoundary state={state}>
        <StaffProposalsDashboard />
      </HydrationBoundary>
    </div>
  );
}
