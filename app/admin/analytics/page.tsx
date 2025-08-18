import { AdminAnalyticsDashboard } from "@/components/admin/analytics/admin-analytics-dashboard";
import { createTRPCCaller } from "@/lib/trpc/server/caller";

export const dynamic = "force-dynamic";

export default async function AdminAnalyticsPage() {
  const caller = await createTRPCCaller();
  const [overview, problems] = await Promise.all([
    caller.admin.analytics.overview(),
    caller.admin.analytics.problems(),
  ]);

  return (
    <div className="space-y-8 font-mono text-foreground">
      <AdminAnalyticsDashboard initialOverview={overview} initialProblems={problems} />
    </div>
  );
}
