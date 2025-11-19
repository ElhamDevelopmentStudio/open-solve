import { AdminContestsClient } from "@/components/admin/contests/admin-contests-client";
import { createTRPCCaller } from "@/lib/trpc/server/caller";

export const dynamic = "force-dynamic";

export default async function AdminContestsPage() {
  const caller = await createTRPCCaller();
  const contests = await caller.admin.contests.list({ limit: 20 });

  return (
    <div className="space-y-6">
      <AdminContestsClient initialData={contests} />
    </div>
  );
}
