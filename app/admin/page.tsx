import { AdminDashboardClient } from "@/components/admin/dashboard/admin-dashboard-client";
import { createTRPCCaller } from "@/lib/trpc/server/caller";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const caller = await createTRPCCaller();
  const overview = await caller.admin.dashboard.overview();

  return (
    <div className="space-y-6">
      <AdminDashboardClient initialData={overview} />
    </div>
  );
}
