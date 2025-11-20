import Link from "next/link";
import { ContestCreationWizard } from "@/components/contests/contest-creation-wizard";
import { Alert, AlertDescription, AlertTitle, Button } from "@/components/ui";
import { Shield } from "@/components/icons";

export default function StaffContestCreatePage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs uppercase text-muted-foreground">Contests</p>
          <h1 className="text-3xl font-semibold tracking-tight">Phase 13 quality gate</h1>
          <p className="text-sm text-muted-foreground">
            This workspace enforces the Quality & Security checklist before any contest ships.
          </p>
        </div>
        <Button asChild variant="ghost" className="h-9">
          <Link href="/staff/contests">Back to control room</Link>
        </Button>
      </div>
      <Alert className="mt-6 border-border/70 bg-card/70">
        <Shield className="h-4 w-4" />
        <AlertTitle>Quality & Security</AlertTitle>
        <AlertDescription>
          Every step below enforces sanitization, anonymization, and observability requirements from
          Phase 13.
        </AlertDescription>
      </Alert>
      <div className="mt-6">
        <ContestCreationWizard canCreate variant="page" />
      </div>
    </div>
  );
}
