import { AdminUsersClient } from "@/components/admin/users/admin-users-client";
import { createTRPCCaller } from "@/lib/trpc/server/caller";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const caller = await createTRPCCaller();
  const initialList = await caller.admin.users.list({ limit: 25 });

  return (
    <div className="space-y-6">
      <AdminUsersClient initialList={initialList} />
    </div>
  );
}
