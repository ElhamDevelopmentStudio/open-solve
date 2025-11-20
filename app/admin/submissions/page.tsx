import { AdminSubmissionsClient } from "@/components/admin/submissions/admin-submissions-client";
import { createTRPCCaller } from "@/lib/trpc/server/caller";

export const dynamic = "force-dynamic";

export default async function AdminSubmissionsPage() {
  const caller = await createTRPCCaller();
  const initialData = await caller.admin.submissions.list({ limit: 25 });

  return (
    <div className="space-y-6">
      <AdminSubmissionsClient initialData={initialData} />
    </div>
  );
}
