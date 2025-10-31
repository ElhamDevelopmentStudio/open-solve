import { PROBLEM_STATUS_FILTERS } from "@/lib/problems/constants";
import { cn } from "@/lib/utils";
import { CheckCircle2, Hourglass, Minus } from "lucide-react";

type ProblemStatus = (typeof PROBLEM_STATUS_FILTERS)[number];

const STATUS_LABELS: Record<ProblemStatus, string> = {
  SOLVED: "Solved",
  ATTEMPTED: "Attempted",
  UNSEEN: "Unseen",
};

const STATUS_TONE: Record<ProblemStatus, string> = {
  SOLVED: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  ATTEMPTED: "bg-amber-500/10 text-amber-600 dark:text-amber-300",
  UNSEEN: "bg-muted text-muted-foreground",
};

export function ProblemStatusBadge({ status }: { status: ProblemStatus }) {
  const icon =
    status === "SOLVED" ? (
      <CheckCircle2 className="h-3.5 w-3.5" />
    ) : status === "ATTEMPTED" ? (
      <Hourglass className="h-3.5 w-3.5" />
    ) : (
      <Minus className="h-3.5 w-3.5" />
    );

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium",
        STATUS_TONE[status],
      )}
    >
      {icon}
      {STATUS_LABELS[status]}
    </span>
  );
}
