import { AdminProblemsClient } from "@/components/admin/problems/admin-problems-client";
import { createTRPCCaller } from "@/lib/trpc/server/caller";

export const dynamic = "force-dynamic";

export default async function AdminProblemsPage() {
  const caller = await createTRPCCaller();
  const initialData = await caller.admin.problems.list({ limit: 25 });

  return (
    <div className="space-y-6">
      <AdminProblemsClient initialData={initialData} />
    </div>
  );
}
