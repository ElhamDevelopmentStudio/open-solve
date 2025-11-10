import { prisma } from "@/lib/prisma";
import { parseProblemSamples, type ProblemSample } from "@/lib/problems/samples";
import type { JudgeCaseResult, JudgeVerdictCode, SubmissionDetailPayload } from "@/lib/submissions/types";
import { Prisma, SubmissionStatus, TestCaseKind } from "@prisma/client";

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
  return buildSubmissionPayload(record);
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
    payload: buildSubmissionPayload(record),
  };
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
      testCases: {
        orderBy: { ordinal: "asc" },
        select: { ordinal: true, kind: true },
      },
      samples: true,
    },
  },
} satisfies Prisma.SubmissionInclude;

function buildSubmissionPayload(record: SubmissionRecord): SubmissionDetailPayload {
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
  const consoleMessages = Array.isArray(metadata.console)
    ? ((metadata.console as string[]) ?? [])
    : [];

  return {
    id: record.id,
    problemId: record.problemId,
    languageCode: record.languageCode,
    sourceCode: typeof metadata.sourceCode === "string" ? (metadata.sourceCode as string) : "",
    stdin: typeof metadata.stdin === "string" ? (metadata.stdin as string) : undefined,
    status: record.status as SubmissionDetailPayload["status"],
    verdictCode: record.verdictCode as SubmissionDetailPayload["verdictCode"],
    summary,
    cases: caseResults,
    console: consoleMessages,
    createdAt: record.createdAt,
    startedAt: record.startedAt,
    finishedAt: record.finishedAt,
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
      (cases.length ? Math.round(cases.reduce((sum, item) => sum + item.memoryKb, 0) / cases.length) : 0),
    startedAt: submission.startedAt ?? submission.createdAt,
    finishedAt: submission.finishedAt ?? submission.updatedAt,
  };
}
