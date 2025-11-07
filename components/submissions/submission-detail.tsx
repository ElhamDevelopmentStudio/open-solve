"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import type { SubmissionDetailPayload } from "@/lib/submissions/types";
import { SubmissionStatusBadge } from "@/components/submissions/status-badge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Copy,
  Link2,
  Play,
  RefreshCcw,
  Share2,
} from "@/components/icons";
import { useSubmissionRealtime } from "@/hooks/use-submission-realtime";
import { cn } from "@/lib/utils";

type SubmissionDetailClientProps = {
  submissionId: string;
  initialSubmission: SubmissionDetailPayload;
};

export function SubmissionDetailClient({ submissionId, initialSubmission }: SubmissionDetailClientProps) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const detailQuery = trpc.submissions.get.useQuery(
    { submissionId },
    {
      initialData: initialSubmission,
      refetchOnWindowFocus: false,
    },
  );
  const submission = detailQuery.data ?? initialSubmission;

  useSubmissionRealtime({
    submissionId,
    onUpdate: (detail) => {
      utils.submissions.get.setData({ submissionId }, detail);
    },
  });

  const resubmit = trpc.submissions.resubmit.useMutation({
    onSuccess: ({ submissionId: nextId }) => {
      toast.success("Submission queued");
      router.push(`/submissions/${nextId}`);
    },
    onError: (error) => toast.error(error.message ?? "Unable to resubmit"),
  });

  const shareEnable = trpc.submissions.shareEnable.useMutation({
    onSuccess: () => {
      toast.success("Share link created");
      void detailQuery.refetch();
    },
    onError: (error) => toast.error(error.message ?? "Unable to share submission"),
  });

  const shareDisable = trpc.submissions.shareDisable.useMutation({
    onSuccess: () => {
      toast.success("Sharing disabled");
      void detailQuery.refetch();
    },
    onError: (error) => toast.error(error.message ?? "Unable to disable share link"),
  });

  const hideMutation = trpc.submissions.hideFromProfile.useMutation({
    onSuccess: () => {
      toast.success("Visibility updated");
      void detailQuery.refetch();
    },
    onError: (error) => toast.error(error.message ?? "Unable to update visibility"),
  });

  const handleResubmit = () => {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm("Resubmit the same code?");
      if (!confirmed) {
        return;
      }
    }
    resubmit.mutate({ submissionId });
  };

  const handleShareToggle = () => {
    if (submission.share.enabled) {
      shareDisable.mutate({ submissionId });
    } else {
      shareEnable.mutate({ submissionId });
    }
  };

  const handleVisibilityToggle = () => {
    hideMutation.mutate({ submissionId, hidden: !submission.hiddenFromProfile });
  };

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="gap-2">
        <Link href="/submissions">
          <ArrowLeft className="h-4 w-4" />
          All submissions
        </Link>
      </Button>
      <SubmissionHeader submission={submission} />
      <div className="flex flex-wrap gap-2">
        {submission.permissions.canResubmit ? (
          <Button onClick={handleResubmit} disabled={resubmit.isPending} className="gap-2">
            <RefreshCcw className="h-4 w-4" />
            Resubmit
          </Button>
        ) : null}
        {submission.permissions.canToggleShare ? (
          <Button
            onClick={handleShareToggle}
            variant={submission.share.enabled ? "secondary" : "outline"}
            className="gap-2"
            disabled={shareEnable.isPending || shareDisable.isPending}
          >
            <Share2 className="h-4 w-4" />
            {submission.share.enabled ? "Disable share" : "Enable share"}
          </Button>
        ) : null}
        {submission.permissions.canHideFromProfile ? (
          <Button
            variant="ghost"
            size="sm"
            disabled={hideMutation.isPending}
            onClick={handleVisibilityToggle}
          >
            {submission.hiddenFromProfile ? "Show on profile" : "Hide on profile"}
          </Button>
        ) : null}
      </div>
      <SubmissionSummary submission={submission} />
      <SharePanel submission={submission} />
      <Timeline timeline={submission.timeline} />
      <CasesSection submission={submission} />
      <CodeSection submission={submission} />
      <ConsoleSection submission={submission} />
    </div>
  );
}

export function SubmissionReadOnlyView({ submission }: { submission: SubmissionDetailPayload }) {
  return (
    <div className="space-y-6">
      <SubmissionHeader submission={submission} />
      <SubmissionSummary submission={submission} />
      <Timeline timeline={submission.timeline} />
      <CasesSection submission={submission} />
      <CodeSection submission={submission} />
      <ConsoleSection submission={submission} />
    </div>
  );
}

function SubmissionHeader({ submission }: { submission: SubmissionDetailPayload }) {
  return (
    <div className="rounded-2xl border border-border bg-card/70 p-6 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <SubmissionStatusBadge verdict={submission.verdictCode} status={submission.status} size="md" />
          <h1 className="text-2xl font-semibold text-foreground">{submission.problem.title}</h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>{submission.language.displayName ?? submission.language.code}</span>
            <span>•</span>
            <span>{new Date(submission.createdAt).toLocaleString()}</span>
            {submission.contest ? (
              <>
                <span>•</span>
                <Badge variant="outline">Contest</Badge>
              </>
            ) : null}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/problems/${submission.problem.slug}`}>
              View problem
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigator.clipboard.writeText(submission.id)}>
            <Copy className="mr-2 h-4 w-4" />
            Copy ID
          </Button>
        </div>
      </div>
    </div>
  );
}

function SubmissionSummary({ submission }: { submission: SubmissionDetailPayload }) {
  const stats = [
    {
      label: "Runtime",
      value: submission.summary?.runtimeMs ? `${submission.summary.runtimeMs} ms` : "—",
    },
    {
      label: "Memory",
      value: submission.summary?.memoryKb ? `${submission.summary.memoryKb} kb` : "—",
    },
    {
      label: "Tests passed",
      value:
        submission.summary?.total != null
          ? `${submission.summary.passed}/${submission.summary.total}`
          : "Pending",
    },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {stats.map((stat) => (
        <Card key={stat.label} className="p-4">
          <p className="text-xs uppercase text-muted-foreground">{stat.label}</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{stat.value}</p>
        </Card>
      ))}
    </div>
  );
}

function SharePanel({ submission }: { submission: SubmissionDetailPayload }) {
  if (!submission.share.enabled || !submission.share.publicId) return null;
  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/share/s/${submission.share.publicId}`
      : `/share/s/${submission.share.publicId}`;
  return (
    <Card className="p-4">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">Share link</p>
          <p className="text-xs text-muted-foreground">Anyone with the link can view this attempt.</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigator.clipboard.writeText(shareUrl)}
          className="gap-2"
        >
          <Link2 className="h-4 w-4" />
          Copy link
        </Button>
      </div>
      <div className="rounded-md border border-dashed border-border/70 bg-muted/10 p-3 text-sm text-muted-foreground">
        {shareUrl}
      </div>
    </Card>
  );
}

function Timeline({ timeline }: { timeline: SubmissionDetailPayload["timeline"] }) {
  return (
    <div className="rounded-2xl border border-border/80 bg-card/70 p-6">
      <h2 className="text-sm font-semibold text-foreground">Timeline</h2>
      <div className="mt-4 flex flex-wrap gap-4">
        {timeline.map((event) => (
          <div key={event.stage} className="flex items-center gap-3">
            <div
              className={cn(
                "h-3 w-3 rounded-full",
                event.state === "complete"
                  ? "bg-emerald-500"
                  : event.state === "active"
                    ? "bg-blue-500 animate-pulse"
                    : "bg-muted",
              )}
            />
            <div>
              <p className="text-sm font-medium text-foreground">{event.label}</p>
              <p className="text-xs text-muted-foreground">
                {event.at ? new Date(event.at).toLocaleTimeString() : "Pending"}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CasesSection({ submission }: { submission: SubmissionDetailPayload }) {
  const [tab, setTab] = useState<"all" | "failed" | "stderr">("all");
  const cases = useMemo(() => {
    if (tab === "failed") {
      return submission.cases.filter((test) => test.status !== "PASSED");
    }
    if (tab === "stderr") {
      return submission.cases.filter((test) => test.stderr);
    }
    return submission.cases;
  }, [tab, submission.cases]);

  if (submission.feedbackRestricted) {
    return (
      <Card className="border-amber-300/40 bg-amber-100/10 p-4 text-sm text-amber-900 dark:text-amber-200">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          Detailed feedback will unlock after the contest ends.
        </div>
        {submission.restrictionReason ? (
          <p className="mt-2 text-xs text-amber-800 dark:text-amber-300">{submission.restrictionReason}</p>
        ) : null}
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Per-test results</h2>
        <Tabs value={tab} onValueChange={(value) => setTab(value as typeof tab)} className="w-auto">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="failed">Failed</TabsTrigger>
            <TabsTrigger value="stderr">Stderr</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <ScrollArea className="mt-4 max-h-[360px]">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="py-2">#</th>
              <th>Verdict</th>
              <th>Runtime</th>
              <th>Memory</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/70">
            {cases.map((test) => (
              <tr key={`${test.ordinal}-${test.verdictCode}`}>
                <td className="py-3 text-muted-foreground">{test.ordinal}</td>
                <td>
                  <SubmissionStatusBadge verdict={test.verdictCode} status={test.status} size="sm" />
                </td>
                <td>{test.runtimeMs} ms</td>
                <td>{test.memoryKb} kb</td>
                <td className="text-xs text-muted-foreground">
                  {test.expectedOutput ? (
                    <div>
                      <span className="font-semibold text-foreground">Exp:</span> {test.expectedOutput}
                    </div>
                  ) : null}
                  {test.actualOutput ? (
                    <div>
                      <span className="font-semibold text-foreground">Out:</span> {test.actualOutput}
                    </div>
                  ) : null}
                  {test.stderr ? (
                    <div className="text-rose-500">stderr: {test.stderr}</div>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollArea>
    </Card>
  );
}

function CodeSection({ submission }: { submission: SubmissionDetailPayload }) {
  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Submitted code</h2>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2"
          onClick={() => navigator.clipboard.writeText(submission.sourceCode)}
        >
          <Copy className="h-4 w-4" />
          Copy
        </Button>
      </div>
      <ScrollArea className="max-h-[420px]">
        <pre className="rounded-xl border border-border/70 bg-muted/20 p-4 text-sm text-foreground">
          <code>{submission.sourceCode}</code>
        </pre>
      </ScrollArea>
    </Card>
  );
}

function ConsoleSection({ submission }: { submission: SubmissionDetailPayload }) {
  if (!submission.console.length) return null;
  return (
    <Card className="p-4">
      <h2 className="text-sm font-semibold text-foreground">Judge output</h2>
      <div className="mt-2 space-y-1 rounded-md bg-muted/20 p-3 font-mono text-xs text-muted-foreground">
        {submission.console.map((line, index) => (
          <div key={`${line}-${index}`}>{line}</div>
        ))}
      </div>
    </Card>
  );
}
