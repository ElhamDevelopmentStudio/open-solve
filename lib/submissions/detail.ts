import { prisma } from "@/lib/prisma";
import { parseProblemSamples, type ProblemSample } from "@/lib/problems/samples";
import type {
  JudgeCaseResult,
  JudgeVerdictCode,
  SubmissionDetailPayload,
} from "@/lib/submissions/types";
import { Prisma, SubmissionStatus, TestCaseKind, type UserRole } from "@prisma/client";
import { isStaffRole } from "@/lib/auth/permissions";
import type { SubmissionTimelineEvent } from "@/lib/submissions/types";

type SubmissionRecord = Prisma.SubmissionGetPayload<{
  include: {
    caseResults: {
      orderBy: { testOrdinal: "asc" };
      select: {
        testOrdinal: true;
        verdictCode: true;
        timeMs: true;
        memoryKb: true;
        stderrRef: true;
      };
    };
    problemVersion: {
      select: {
        title: true;
        testCases: {
          orderBy: { ordinal: "asc" };
          select: {
            ordinal: true;
            kind: true;
            input: true;
            output: true;
          };
        };
        samples: true;
      };
    };
    problem: {
      select: {
        id: true;
        slug: true;
        difficulty: { select: { name: true } };
        currentVersion: { select: { title: true } };
      };
    };
    language: {
      select: {
        code: true;
        displayName: true;
      };
    };
    user: {
      select: {
        id: true;
        handle: true;
        name: true;
        avatarUrl: true;
        role: true;
      };
    };
    manualReviewer: {
      select: {
        id: true;
        handle: true;
        name: true;
      };
    };
    contest: {
      select: {
        id: true;
        slug: true;
        name: true;
        state: true;
        startsAt: true;
        endsAt: true;
      };
    };
  };
}>;

export async function getSubmissionDetailForUser(
  submissionId: string,
  userId: string,
): Promise<SubmissionDetailPayload | null> {
  const record = await prisma.submission.findFirst({
    where: { id: submissionId, userId, deletedAt: null },
    include: submissionDetailInclude,
  });
  if (!record) {
    return null;
  }
  return buildSubmissionPayload(record, {
    viewerId: userId,
    viewerRole: record.user.role,
  });
}

export async function getSubmissionDetailForBroadcast(
  submissionId: string,
): Promise<{ userId: string; payload: SubmissionDetailPayload } | null> {
  const record = await prisma.submission.findFirst({
    where: { id: submissionId, deletedAt: null },
    include: submissionDetailInclude,
  });
  if (!record) {
    return null;
  }
  return {
    userId: record.userId,
    payload: buildSubmissionPayload(record, {
      viewerId: record.userId,
      viewerRole: record.user.role,
    }),
  };
}

export async function getSubmissionDetailForViewer(
  submissionId: string,
  viewer: { id: string; role: UserRole },
): Promise<SubmissionDetailPayload | null> {
  const where: Prisma.SubmissionWhereInput = { id: submissionId, deletedAt: null };
  if (!isStaffRole(viewer.role)) {
    where.userId = viewer.id;
  }
  const record = await prisma.submission.findFirst({
    where,
    include: submissionDetailInclude,
  });
  if (!record) {
    return null;
  }
  return buildSubmissionPayload(record, {
    viewerId: viewer.id,
    viewerRole: viewer.role,
  });
}

export async function getSubmissionDetailForShare(
  publicId: string,
): Promise<SubmissionDetailPayload | null> {
  const record = await prisma.submission.findFirst({
    where: {
      sharePublicId: publicId,
      isShareEnabled: true,
      shareRevokedAt: null,
      deletedAt: null,
    },
    include: submissionDetailInclude,
  });
  if (!record) {
    return null;
  }
  return buildSubmissionPayload(record, { scope: "share" });
}

const submissionDetailInclude = {
  caseResults: {
    orderBy: { testOrdinal: "asc" },
    select: {
      testOrdinal: true,
      verdictCode: true,
      timeMs: true,
      memoryKb: true,
      stderrRef: true,
    },
  },
  problemVersion: {
    select: {
      title: true,
      testCases: {
        orderBy: { ordinal: "asc" },
        select: { ordinal: true, kind: true },
      },
      samples: true,
    },
  },
  problem: {
    select: {
      id: true,
      slug: true,
      difficulty: { select: { name: true } },
      currentVersion: { select: { title: true } },
    },
  },
  language: {
    select: { code: true, displayName: true },
  },
  user: {
    select: { id: true, handle: true, name: true, avatarUrl: true, role: true },
  },
  manualReviewer: {
    select: { id: true, handle: true, name: true },
  },
  contest: {
    select: { id: true, slug: true, name: true, state: true, startsAt: true, endsAt: true },
  },
} satisfies Prisma.SubmissionInclude;

type BuildSubmissionPayloadOptions = {
  viewerId?: string | null;
  viewerRole?: UserRole | null;
  scope?: "default" | "share";
};

function buildSubmissionPayload(
  record: SubmissionRecord,
  options: BuildSubmissionPayloadOptions = {},
): SubmissionDetailPayload {
  const metadata = (record.metadata ?? {}) as Record<string, unknown>;
  const samples = parseProblemSamples(record.problemVersion?.samples ?? null);
  const mappedTests = mapTestCases(record.problemVersion?.testCases ?? [], samples);
  type AttachmentCase = {
    ordinal: number;
    actualOutput?: string | null;
    inputPreview?: string | null;
    expectedOutput?: string | null;
    stderr?: string | null;
  };
  const attachmentCases: AttachmentCase[] = Array.isArray(metadata.cases)
    ? (metadata.cases as AttachmentCase[])
    : [];

  const caseResults: SubmissionDetailPayload["cases"] = record.caseResults.map((result) => {
    const testCase = mappedTests.find((test) => test.ordinal === result.testOrdinal);
    const attachment = attachmentCases.find((entry) => entry.ordinal === result.testOrdinal);
    const verdictCode = (result.verdictCode ?? "WA") as JudgeCaseResult["verdictCode"];
    const status: JudgeCaseResult["status"] =
      verdictCode === "AC"
        ? "PASSED"
        : verdictCode === "CE" || verdictCode === "RE"
          ? "ERROR"
          : "FAILED";
    return {
      ordinal: result.testOrdinal,
      verdictCode,
      status,
      runtimeMs: result.timeMs ?? 0,
      memoryKb: result.memoryKb ?? 0,
      inputPreview: attachment?.inputPreview ?? testCase?.input ?? null,
      expectedOutput: attachment?.expectedOutput ?? testCase?.output ?? null,
      actualOutput: attachment?.actualOutput ?? null,
      stderr: attachment?.stderr ?? result.stderrRef ?? null,
      hidden: testCase?.kind === "HIDDEN",
    };
  });

  const summary = buildSummary(caseResults, record);
  const manualNotes =
    typeof record.manualNotes === "string"
      ? record.manualNotes
      : typeof metadata.manualNotes === "string"
        ? (metadata.manualNotes as string)
        : null;
  const consoleMessages = Array.isArray(metadata.console)
    ? ((metadata.console as string[]) ?? [])
    : [];
  const viewerId = options.viewerId ?? null;
  const viewerRole = options.viewerRole ?? null;
  const isOwner = viewerId === record.userId;
  const staffViewer = viewerRole ? isStaffRole(viewerRole) : false;
  const isShareView = options.scope === "share";
  const shareEnabled =
    Boolean(record.isShareEnabled) && Boolean(record.sharePublicId) && !record.shareRevokedAt;
  const now = new Date();
  const contestActive = Boolean(
    record.contest && record.contest.startsAt <= now && record.contest.endsAt > now,
  );
  const feedbackRestricted = contestActive && !staffViewer;
  const restrictionReason = feedbackRestricted
    ? `Detailed feedback unlocks once the contest ends (${record.contest?.endsAt.toLocaleString()}).`
    : null;

  const filteredCases = feedbackRestricted ? [] : caseResults;
  const timeline = buildTimeline(record);
  const canViewCode = isOwner || staffViewer || isShareView;
  const canViewCases = !feedbackRestricted || staffViewer;
  const canToggleShare = isOwner && !contestActive;
  const canShare = canToggleShare;
  const canHide = isOwner || staffViewer;
  const sharePayload = {
    enabled: shareEnabled,
    publicId: shareEnabled ? record.sharePublicId : null,
    enabledAt: record.shareEnabledAt ?? undefined,
    revokedAt: record.shareRevokedAt ?? undefined,
  };

  return {
    id: record.id,
    problemId: record.problemId,
    problem: {
      id: record.problem?.id ?? record.problemId,
      slug: record.problem?.slug ?? "",
      title:
        record.problemVersion?.title ??
        record.problem?.currentVersion?.title ??
        record.problem?.slug ??
        "Problem",
      difficulty: record.problem?.difficulty?.name ?? null,
    },
    owner: isShareView
      ? null
      : {
          id: record.user.id,
          handle: record.user.handle,
          name: record.user.name,
          avatarUrl: record.user.avatarUrl,
        },
    language: {
      code: record.language.code,
      displayName: record.language.displayName,
    },
    contest: record.contest
      ? {
          id: record.contest.id,
          slug: record.contest.slug,
          name: record.contest.name,
          state: record.contest.state,
          startsAt: record.contest.startsAt,
          endsAt: record.contest.endsAt,
        }
      : null,
    languageCode: record.languageCode,
    sourceCode: typeof metadata.sourceCode === "string" ? (metadata.sourceCode as string) : "",
    stdin: typeof metadata.stdin === "string" ? (metadata.stdin as string) : undefined,
    status: record.status as SubmissionDetailPayload["status"],
    verdictCode: record.verdictCode as SubmissionDetailPayload["verdictCode"],
    codeHash: record.codeHash,
    summary,
    cases: filteredCases,
    console: consoleMessages,
    createdAt: record.createdAt,
    startedAt: record.startedAt,
    finishedAt: record.finishedAt,
    timeline,
    review: {
      requiresManualReview: record.requiresManualReview,
      reviewerName: staffViewer
        ? (record.manualReviewer?.name ?? record.manualReviewer?.handle ?? null)
        : null,
      reviewerId: staffViewer ? (record.manualReviewer?.id ?? null) : null,
      reviewedAt: record.manualReviewedAt ?? undefined,
      manualScore: typeof record.manualScore === "number" ? record.manualScore : null,
      internalNotesVisible: staffViewer,
      internalNotes: staffViewer && manualNotes ? manualNotes : null,
    },
    permissions: {
      canResubmit: isOwner,
      canToggleShare,
      canShare,
      canHideFromProfile: canHide,
      canViewCode,
      canViewCases,
    },
    share: sharePayload,
    performanceDelta: null,
    feedbackRestricted,
    restrictionReason: restrictionReason ?? undefined,
    hiddenFromProfile: Boolean(record.hiddenFromProfile),
  };
}

export function mapTestCases(
  tests: Array<{ ordinal: number; kind: TestCaseKind }> = [],
  samples: ProblemSample[],
) {
  const mapped: Array<{ ordinal: number; input: string; output: string; kind: TestCaseKind }> = [];
  let sampleCursor = 0;

  for (const test of tests) {
    if (test.kind === TestCaseKind.SAMPLE) {
      const sample = samples[sampleCursor];
      mapped.push({
        ordinal: test.ordinal,
        input: sample?.input ?? `Sample #${test.ordinal}`,
        output: sample?.output ?? "",
        kind: test.kind,
      });
      sampleCursor += 1;
    } else {
      mapped.push({
        ordinal: test.ordinal,
        input: `Hidden test #${test.ordinal}`,
        output: `Hidden test #${test.ordinal}`,
        kind: test.kind,
      });
    }
  }
  return mapped;
}

function buildSummary(cases: SubmissionDetailPayload["cases"], submission: SubmissionRecord) {
  if (cases.length === 0 && submission.status !== SubmissionStatus.SUCCEEDED) {
    return null;
  }
  const passed = cases.filter((item) => item.status === "PASSED").length;
  const failed = cases.filter((item) => item.status === "FAILED").length;
  const errored = cases.filter((item) => item.status === "ERROR").length;
  const verdict: JudgeVerdictCode =
    (submission.verdictCode as JudgeVerdictCode) ??
    (cases.length && cases.every((c) => c.verdictCode === "AC") ? "AC" : "WA");
  return {
    verdictCode: verdict,
    passed,
    failed,
    errored,
    total: cases.length,
    runtimeMs: submission.timeUsedMs ?? cases.reduce((sum, item) => sum + item.runtimeMs, 0),
    memoryKb:
      submission.memoryUsedKb ??
      (cases.length
        ? Math.round(cases.reduce((sum, item) => sum + item.memoryKb, 0) / cases.length)
        : 0),
    startedAt: submission.startedAt ?? submission.createdAt,
    finishedAt: submission.finishedAt ?? submission.updatedAt,
  };
}

function buildTimeline(record: SubmissionRecord): SubmissionTimelineEvent[] {
  const verdict = (record.verdictCode as JudgeVerdictCode | null) ?? null;
  const status = record.status as SubmissionDetailPayload["status"];
  const queued: SubmissionTimelineEvent = {
    stage: "QUEUED",
    label: "Queued",
    at: record.queuedAt ?? record.createdAt,
    state: record.startedAt ? "complete" : "active",
  };
  const running: SubmissionTimelineEvent = {
    stage: "RUNNING",
    label: "Running",
    at: record.startedAt ?? undefined,
    state:
      status === "RUNNING"
        ? "active"
        : record.startedAt
          ? "complete"
          : record.startedAt
            ? "complete"
            : "pending",
  };
  const finishedStates: SubmissionTimelineEvent = {
    stage: "FINISHED",
    label: "Finished",
    at: record.finishedAt ?? undefined,
    state:
      status === "SUCCEEDED" || status === "FAILED"
        ? "complete"
        : record.finishedAt
          ? "complete"
          : record.requiresManualReview
            ? "pending"
            : status === "MANUAL_PENDING"
              ? "pending"
              : "pending",
    description: verdict ?? undefined,
  };

  const timeline: SubmissionTimelineEvent[] = [queued, running, finishedStates];

  if (
    record.requiresManualReview ||
    status === "MANUAL_PENDING" ||
    verdict?.startsWith("MANUAL_")
  ) {
    timeline.push(
      {
        stage: "MANUAL_REVIEW",
        label: "Manual review",
        at: record.manualDueAt ?? undefined,
        state:
          status === "MANUAL_PENDING" ? "active" : record.manualReviewedAt ? "complete" : "pending",
        description:
          status === "MANUAL_PENDING" && !record.manualReviewedAt
            ? "Awaiting reviewer decision"
            : undefined,
      },
      {
        stage: "MANUAL_DECISION",
        label: "Manual decision",
        at: record.manualReviewedAt ?? undefined,
        state: record.manualReviewedAt ? "complete" : "pending",
        description: verdict ?? undefined,
      },
    );
  }

  return timeline;
}
