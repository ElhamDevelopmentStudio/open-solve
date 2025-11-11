import Link from "next/link";
import { ContestCreationWizard } from "@/components/contests/contest-creation-wizard";
import { Button } from "@/components/ui";

export default function StaffContestCreatePage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs uppercase text-muted-foreground">Contests</p>
          <h1 className="text-3xl font-semibold tracking-tight">Launch a contest</h1>
          <p className="text-sm text-muted-foreground">
            Fill out the basics, schedule, problem set, and rules in one focused surface.
          </p>
        </div>
        <Button asChild variant="ghost" className="h-9">
          <Link href="/staff/contests">Back to control room</Link>
        </Button>
      </div>
      <div className="mt-6">
        <ContestCreationWizard canCreate variant="page" />
      </div>
    </div>
  );
}
