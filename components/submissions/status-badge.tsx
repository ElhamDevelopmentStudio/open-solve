import { cn } from "@/lib/utils";

type SubmissionStatusBadgeProps = {
  verdict?: string | null;
  status?: string | null;
  size?: "sm" | "md";
  className?: string;
};

const badgeSizes: Record<NonNullable<SubmissionStatusBadgeProps["size"]>, string> = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-3 py-1 text-xs md:text-sm",
};

export function SubmissionStatusBadge({
  verdict,
  status,
  size = "sm",
  className,
}: SubmissionStatusBadgeProps) {
  const { tone, label } = getBadgePresentation(verdict, status);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium uppercase tracking-wide",
        badgeSizes[size],
        tone,
        className,
      )}
    >
      {label}
    </span>
  );
}

export function getBadgePresentation(verdict?: string | null, status?: string | null) {
  const normalizedVerdict = verdict ?? "";
  const normalizedStatus = status ?? "";
  let tone = "bg-muted text-muted-foreground";
  let label = normalizedVerdict || normalizedStatus || "Pending";

  if (normalizedVerdict === "AC") {
    tone = "bg-emerald-500/15 text-emerald-500";
    label = "Accepted";
  } else if (["WA", "RE", "TLE", "MLE", "CE"].includes(normalizedVerdict)) {
    tone = "bg-rose-500/15 text-rose-500";
  } else if (normalizedVerdict === "MANUAL_ACCEPTED") {
    tone = "bg-purple-500/15 text-purple-500";
    label = "Manual Accepted";
  } else if (normalizedVerdict === "MANUAL_PARTIAL") {
    tone = "bg-purple-500/15 text-purple-500";
    label = "Manual Partial";
  } else if (normalizedVerdict === "MANUAL_REJECTED") {
    tone = "bg-rose-500/15 text-rose-500";
    label = "Manual Rejected";
  } else if (normalizedStatus === "RUNNING") {
    tone = "bg-blue-500/15 text-blue-500";
    label = "Running";
  } else if (normalizedStatus === "QUEUED") {
    tone = "bg-muted text-muted-foreground";
    label = "Queued";
  } else if (normalizedStatus === "RETRYING") {
    tone = "bg-amber-500/20 text-amber-600";
    label = "Retrying";
  } else if (normalizedStatus === "MANUAL_PENDING") {
    tone = "bg-purple-500/15 text-purple-500";
    label = "Manual Review";
  }

  return { tone, label };
}
