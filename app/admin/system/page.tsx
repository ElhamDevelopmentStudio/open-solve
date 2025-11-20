import { AdminSystemClient } from "@/components/admin/system/admin-system-client";
import { createTRPCCaller } from "@/lib/trpc/server/caller";

export const dynamic = "force-dynamic";

export default async function AdminSystemPage() {
  const caller = await createTRPCCaller();
  const [system, flags] = await Promise.all([
    caller.admin.system.overview(),
    caller.admin.flags.list(),
  ]);

  return (
    <div className="space-y-6">
      <AdminSystemClient initialSystem={system} initialFlags={flags} />
    </div>
  );
}
