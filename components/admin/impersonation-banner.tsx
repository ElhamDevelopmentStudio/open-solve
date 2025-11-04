"use client";

import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "@/components/icons";
import { toast } from "sonner";

export function ImpersonationBanner() {
  const sessionQuery = trpc.auth.getSession.useQuery(undefined, {
    staleTime: 5_000,
  });
  const exitMutation = trpc.admin.impersonation.stop.useMutation({
    onSuccess: () => {
      toast.success("Exited impersonation");
      sessionQuery.refetch();
      window.location.reload();
    },
    onError: (error) => toast.error("Failed to exit impersonation", { description: error.message }),
  });

  const impersonationActive = Boolean(sessionQuery.data?.session.impersonatorId);
  if (!impersonationActive) {
    return null;
  }

  const adminHandle = sessionQuery.data?.impersonator?.handle ?? "Admin";
  const targetHandle = sessionQuery.data?.user.handle ?? "user";

  return (
    <div className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4">
      <div className="flex w-full max-w-3xl items-center justify-between rounded-2xl border border-warning/50 bg-warning/10 px-4 py-3 shadow-lg backdrop-blur">
        <div className="flex items-center gap-3">
          <ShieldAlert className="h-5 w-5 text-warning-foreground" />
          <div>
            <p className="text-sm font-semibold text-warning-foreground">
              Acting as {targetHandle}
            </p>
            <p className="text-xs text-warning-foreground/80">
              All actions are attributed to {adminHandle}. Exit impersonation to regain your admin
              identity.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="destructive"
            size="sm"
            onClick={() => exitMutation.mutate()}
            disabled={exitMutation.isPending}
          >
            Exit
          </Button>
        </div>
      </div>
    </div>
  );
}
