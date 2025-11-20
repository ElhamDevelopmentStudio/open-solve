import { AdminAuditClient } from "@/components/admin/audit/admin-audit-client";
import { createTRPCCaller } from "@/lib/trpc/server/caller";

export const dynamic = "force-dynamic";

export default async function AdminAuditPage() {
  const caller = await createTRPCCaller();
  const [logs, incidents] = await Promise.all([
    caller.admin.audit.logs(),
    caller.admin.audit.incidents(),
  ]);

  return (
    <div className="space-y-6">
      <AdminAuditClient initialLogs={logs} initialIncidents={incidents} />
    </div>
  );
}
