import { AdminDashboardClient } from "@/components/admin/dashboard/admin-dashboard-client";
import { Badge } from "@/components/ui/badge";
import { adminConfig } from "@/config/admin";
import { createTRPCCaller } from "@/lib/trpc/server/caller";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const caller = await createTRPCCaller();
  const overview = await caller.admin.dashboard.overview();
  const metrics = [
    { label: adminConfig.overview.stats.users, value: overview.users.total.toLocaleString() },
    {
      label: adminConfig.overview.stats.submissions,
      value: overview.submissions.last24h.toLocaleString(),
    },
    { label: adminConfig.overview.stats.problems, value: overview.problems.total.toLocaleString() },
    {
      label: adminConfig.overview.stats.features,
      value: overview.featureFlags.enabled.toLocaleString(),
    },
  ];

  return (
    <div className="space-y-8 font-mono text-foreground">
      <section className="border-2 border-border bg-card p-6 md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.35em] text-primary/80">
              {adminConfig.overview.marker}
              <Badge className="rounded-none border-2 border-border bg-background px-3 py-1 text-[10px] tracking-[0.25em] text-muted-foreground">
                {adminConfig.overview.badge}
              </Badge>
            </div>
            <h1 className="text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
              {adminConfig.overview.headline.line1}
              <br />
              {adminConfig.overview.headline.line2}
              <br />
              <span className="bg-gradient-to-r from-primary via-primary to-primary/70 bg-clip-text text-transparent">
                {adminConfig.overview.headline.line3}
              </span>
            </h1>
            <p className="max-w-3xl text-sm text-muted-foreground">
              {adminConfig.overview.description}
            </p>
          </div>
          <div className="grid w-full gap-3 sm:grid-cols-2 lg:max-w-md">
            {metrics.map((stat) => (
              <div
                key={stat.label}
                className="border-2 border-border bg-background px-4 py-3 text-left"
              >
                <p className="text-[11px] uppercase text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-black">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <AdminDashboardClient initialData={overview} />
    </div>
  );
}
