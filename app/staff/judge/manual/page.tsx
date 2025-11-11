import { ManualJudgeQueue } from "@/components/staff/judge/manual-queue";

export default function ManualJudgePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Manual Judge Queue</h1>
        <p className="text-sm text-muted-foreground">
          Review submissions that require human validation or hybrid scoring.
        </p>
      </div>
      <ManualJudgeQueue />
    </div>
  );
}
