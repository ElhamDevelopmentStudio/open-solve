import Link from "next/link";

import { ManualJudgeQueue } from "@/components/staff/judge/manual-queue";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ManualJudgePage() {
  const session = await getSession();
  if (!session || (session.user.role !== "MODERATOR" && session.user.role !== "ADMIN")) {
    redirect("/staff");
  }
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-semibold tracking-tight">Manual judge desk</h1>
            <Badge variant="secondary" className="uppercase text-[11px]">
              Hybrid scoring
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Validate submissions flagged by the judge for plagiarism, hybrid scoring, or policy
            reasons.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/staff/contests">View running contests</Link>
          </Button>
          <Button asChild>
            <Link href="/staff/problems">Open problem bank</Link>
          </Button>
        </div>
      </div>
      <ManualJudgeQueue />
    </div>
  );
}
