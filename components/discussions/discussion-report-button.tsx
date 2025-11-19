"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Flag } from "@/components/icons";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";

const reasons = [
  { value: "SPAM", label: "Spam" },
  { value: "ABUSE", label: "Abusive" },
  { value: "SPOILER_ABUSE", label: "Spoiler" },
  { value: "OFF_TOPIC", label: "Off topic" },
] as const;

export function DiscussionReportButton({ discussionId }: { discussionId: string }) {
  const mutation = trpc.discussions.report.useMutation({
    onSuccess: () => toast.success("Report submitted"),
    onError: (error) => toast.error(error.message ?? "Unable to report"),
  });
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm">
          <Flag className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuLabel>Report</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {reasons.map((reason) => (
          <DropdownMenuItem
            key={reason.value}
            onSelect={() => mutation.mutate({ discussionId, reason: reason.value })}
            className="cursor-pointer"
          >
            {reason.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
