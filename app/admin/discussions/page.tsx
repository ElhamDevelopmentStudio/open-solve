import { AdminDiscussionsClient } from "@/components/admin/discussions/admin-discussions-client";
import { createTRPCCaller } from "@/lib/trpc/server/caller";

export const dynamic = "force-dynamic";

export default async function AdminDiscussionsPage() {
  const caller = await createTRPCCaller();
  const [threads, reports] = await Promise.all([
    caller.admin.discussions.listThreads({ limit: 25 }),
    caller.admin.discussions.listReports({ status: "OPEN" }),
  ]);

  return (
    <div className="space-y-6">
      <AdminDiscussionsClient initialThreads={threads} initialReports={reports} />
    </div>
  );
}
