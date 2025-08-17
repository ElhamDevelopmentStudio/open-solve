"use client";

import { submissionsConfig } from "@/config/submissions";
import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import type { SubmissionDetailPayload } from "@/lib/submissions/types";
import { SubmissionStatusBadge } from "@/components/submissions/status-badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { AlertTriangle, ArrowLeft, Copy, Link2, RefreshCcw, Share2 } from "@/components/icons";
import { useSubmissionRealtime } from "@/hooks/use-submission-realtime";
import { cn } from "@/lib/utils";

const detailConfig = submissionsConfig.detail;

type SubmissionDetailClientProps = {
  submissionId: string;
  initialSubmission: SubmissionDetailPayload;
};

export function SubmissionDetailClient({
  submissionId,
  initialSubmission,
}: SubmissionDetailClientProps) {
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
      if (!confirmed) return;
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
    <div className="space-y-8 font-mono text-foreground">
      <Button variant="ghost" size="sm" asChild className="gap-2 text-xs font-bold uppercase">
        <Link href="/submissions">
          <ArrowLeft className="h-4 w-4" />
          {detailConfig.backLabel}
        </Link>
      </Button>

      <section className="border-2 border-border bg-card p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.35em] text-primary/70">
              {detailConfig.marker}
            </p>
            <SubmissionStatusBadge
              verdict={submission.verdictCode}
              status={submission.status}
              size="md"
            />
            <h1 className="text-3xl font-black tracking-tight">{submission.problem.title}</h1>
            <div className="text-xs uppercase text-muted-foreground">
              {detailConfig.headerMeta.language}:{" "}
              {submission.language.displayName ?? submission.language.code}
              <span className="mx-2">•</span>
              {detailConfig.headerMeta.createdAt}: {new Date(submission.createdAt).toLocaleString()}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              asChild
              className="gap-2 text-xs font-bold uppercase"
            >
              <Link href={`/problems/${submission.problem.slug}`}>
                {detailConfig.headerMeta.linkLabel}
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigator.clipboard.writeText(submission.id)}
            >
              <Copy className="mr-2 h-4 w-4" />
              Copy ID
            </Button>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        {submission.permissions.canResubmit ? (
          <Button
            onClick={handleResubmit}
            disabled={resubmit.isPending}
            className="gap-2 text-xs font-bold uppercase"
          >
            <RefreshCcw className="h-4 w-4" />
            {detailConfig.actions.resubmit}
          </Button>
        ) : null}
        {submission.permissions.canToggleShare ? (
          <Button
            onClick={handleShareToggle}
            variant={submission.share.enabled ? "secondary" : "outline"}
            className="gap-2 text-xs font-bold uppercase"
            disabled={shareEnable.isPending || shareDisable.isPending}
          >
            <Share2 className="h-4 w-4" />
            {submission.share.enabled
              ? detailConfig.actions.shareDisable
              : detailConfig.actions.shareEnable}
          </Button>
        ) : null}
        {submission.permissions.canHideFromProfile ? (
          <Button
            variant="ghost"
            size="sm"
            disabled={hideMutation.isPending}
            onClick={handleVisibilityToggle}
            className="text-xs font-bold uppercase"
          >
            {submission.hiddenFromProfile ? detailConfig.actions.show : detailConfig.actions.hide}
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
    <div className="space-y-8 font-mono text-foreground">
      <section className="border-2 border-border bg-card p-6">
        <SubmissionStatusBadge
          verdict={submission.verdictCode}
          status={submission.status}
          size="md"
        />
        <h1 className="mt-4 text-3xl font-black tracking-tight">{submission.problem.title}</h1>
      </section>
      <SubmissionSummary submission={submission} />
      <Timeline timeline={submission.timeline} />
      <CasesSection submission={submission} />
      <CodeSection submission={submission} />
      <ConsoleSection submission={submission} />
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
    <section className="border-2 border-border bg-card p-6">
      <SectionTitle marker={detailConfig.marker} title="Execution summary" />
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="border border-border bg-background px-4 py-5">
            <p className="text-[11px] uppercase text-muted-foreground">{stat.label}</p>
            <p className="text-2xl font-black">{stat.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function SharePanel({ submission }: { submission: SubmissionDetailPayload }) {
  if (!submission.share.enabled || !submission.share.publicId) return null;
  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/share/s/${submission.share.publicId}`
      : `/share/s/${submission.share.publicId}`;
  return (
    <section className="border-2 border-border bg-card p-6">
      <SectionTitle marker={detailConfig.share.marker} title={detailConfig.share.title}>
        {detailConfig.share.description}
      </SectionTitle>
      <div className="mt-4 flex flex-wrap gap-3">
        <div className="flex-1 border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
          {shareUrl}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 text-xs font-bold uppercase"
          onClick={() => navigator.clipboard.writeText(shareUrl)}
        >
          <Link2 className="h-4 w-4" />
          {detailConfig.share.copyLabel}
        </Button>
      </div>
    </section>
  );
}

function Timeline({ timeline }: { timeline: SubmissionDetailPayload["timeline"] }) {
  return (
    <section className="border-2 border-border bg-card p-6">
      <SectionTitle marker={detailConfig.timeline.marker} title={detailConfig.timeline.title} />
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {timeline.map((event) => (
          <div
            key={event.stage}
            className="flex items-center gap-3 border border-border bg-background px-4 py-3"
          >
            <div
              className={cn(
                "h-3 w-3",
                event.state === "complete"
                  ? "bg-success"
                  : event.state === "active"
                    ? "bg-primary animate-pulse"
                    : "bg-muted",
              )}
            />
            <div>
              <p className="text-sm font-semibold">{event.label}</p>
              <p className="text-xs text-muted-foreground">
                {event.at ? new Date(event.at).toLocaleTimeString() : "Pending"}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
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
      <section className="border-2 border-amber-400 bg-amber-100/10 p-6 text-sm text-amber-900 dark:text-amber-200">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          Detailed feedback will unlock after the contest ends.
        </div>
        {submission.restrictionReason ? (
          <p className="mt-2 text-xs text-amber-800 dark:text-amber-300">
            {submission.restrictionReason}
          </p>
        ) : null}
      </section>
    );
  }

  return (
    <section className="space-y-4 border-2 border-border bg-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <SectionTitle marker={detailConfig.cases.marker} title={detailConfig.cases.title} />
        <Tabs value={tab} onValueChange={(value) => setTab(value as typeof tab)} className="w-auto">
          <TabsList className="rounded-none border border-border bg-background">
            <TabsTrigger value="all" className="rounded-none px-4 py-2 text-xs font-bold uppercase">
              All
            </TabsTrigger>
            <TabsTrigger
              value="failed"
              className="rounded-none px-4 py-2 text-xs font-bold uppercase"
            >
              Failed
            </TabsTrigger>
            <TabsTrigger
              value="stderr"
              className="rounded-none px-4 py-2 text-xs font-bold uppercase"
            >
              Stderr
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <ScrollArea className="max-h-[360px] border border-border">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-muted/30 text-left text-[11px] uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-2">#</th>
              <th>Verdict</th>
              <th>Runtime</th>
              <th>Memory</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {cases.map((test) => (
              <tr key={`${test.ordinal}-${test.verdictCode}`} className="border-t border-border">
                <td className="px-4 py-3 text-muted-foreground">{test.ordinal}</td>
                <td className="px-4 py-3">
                  <SubmissionStatusBadge
                    verdict={test.verdictCode}
                    status={test.status}
                    size="sm"
                  />
                </td>
                <td className="px-4 py-3">{test.runtimeMs} ms</td>
                <td className="px-4 py-3">{test.memoryKb} kb</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {test.expectedOutput ? (
                    <div>
                      <span className="font-semibold text-foreground">Exp:</span>{" "}
                      {test.expectedOutput}
                    </div>
                  ) : null}
                  {test.actualOutput ? (
                    <div>
                      <span className="font-semibold text-foreground">Out:</span>{" "}
                      {test.actualOutput}
                    </div>
                  ) : null}
                  {test.stderr ? <div className="text-destructive">{test.stderr}</div> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollArea>
    </section>
  );
}

function CodeSection({ submission }: { submission: SubmissionDetailPayload }) {
  return (
    <section className="border-2 border-border bg-card p-6">
      <SectionTitle marker={detailConfig.code.marker} title={detailConfig.code.title} />
      <ScrollArea className="mt-4 max-h-[420px] border border-border">
        <pre className="bg-background p-4 text-sm text-foreground">
          <code>{submission.sourceCode}</code>
        </pre>
      </ScrollArea>
      <Button
        variant="ghost"
        size="sm"
        className="mt-3 gap-2 text-xs font-bold uppercase"
        onClick={() => navigator.clipboard.writeText(submission.sourceCode)}
      >
        <Copy className="h-4 w-4" />
        {detailConfig.share.copyLabel}
      </Button>
    </section>
  );
}

function ConsoleSection({ submission }: { submission: SubmissionDetailPayload }) {
  return (
    <section className="border-2 border-border bg-card p-6">
      <SectionTitle marker={detailConfig.console.marker} title={detailConfig.console.title} />
      {submission.console.length ? (
        <div className="mt-4 space-y-1 border border-border bg-background p-3 text-xs text-muted-foreground">
          {submission.console.map((line, index) => (
            <div key={`${line}-${index}`}>{line}</div>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-xs text-muted-foreground">{detailConfig.console.emptyLabel}</p>
      )}
    </section>
  );
}

function SectionTitle({
  marker,
  title,
  children,
}: {
  marker: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-primary/70">{marker}</p>
      <h2 className="text-2xl font-black tracking-tight">{title}</h2>
      {children ? <p className="mt-2 text-sm text-muted-foreground">{children}</p> : null}
    </div>
  );
}
