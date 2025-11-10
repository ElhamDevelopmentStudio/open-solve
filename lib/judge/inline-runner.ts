import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { Prisma, SubmissionStatus, TestCaseKind } from "@prisma/client";
import { simulateJudgeRun } from "@/lib/submissions/simulator";
import type { JudgeSimulationTestCase, JudgeSummary } from "@/lib/submissions/types";
import { resolveTestcaseIO, resolveSubmissionSource } from "@/lib/judge/testcases";
import { publishManualMessage } from "@/lib/judge/queue";

export const runInlineJudge = async (submissionId: string) => {
  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: {
      problem: { select: { id: true, judgeMode: true } },
      problemVersion: {
        select: {
          id: true,
          testCases: {
            orderBy: { ordinal: "asc" },
            select: {
              ordinal: true,
              kind: true,
              inputBlobRef: true,
              outputBlobRef: true,
              inputData: true,
              outputData: true,
            },
          },
        },
      },
      language: { select: { code: true } },
    },
  });
  if (!submission || !submission.problemVersion) {
    return;
  }

  const metadata = (submission.metadata ?? {}) as Prisma.JsonObject;
  const sourceCode = await resolveSubmissionSource({
    sourceCode: typeof metadata.sourceCode === "string" ? (metadata.sourceCode as string) : null,
    sourceRef: submission.sourceCodeRef,
  });
  if (!sourceCode) {
    logger.error({ submissionId }, "inline judge missing source code");
    return;
  }

  await prisma.submission.update({
    where: { id: submission.id },
    data: {
      status: SubmissionStatus.RUNNING,
      startedAt: new Date(),
    },
  });

  const testCases: JudgeSimulationTestCase[] = [];
  for (const test of submission.problemVersion.testCases) {
    const resolved = await resolveTestcaseIO({
      inputBlobRef: test.inputBlobRef,
      outputBlobRef: test.outputBlobRef,
      inputData: test.inputData,
      outputData: test.outputData,
    });
    const fallbackLabel =
      test.kind === TestCaseKind.SAMPLE
        ? `Sample #${test.ordinal}`
        : `Hidden test #${test.ordinal}`;
    testCases.push({
      ordinal: test.ordinal,
      kind: test.kind,
      input: resolved.input || fallbackLabel,
      output: resolved.output || (test.kind === TestCaseKind.SAMPLE ? "" : fallbackLabel),
    });
  }

  const simulation = simulateJudgeRun({
    problemId: submission.problemId,
    languageCode: submission.language.code,
    sourceCode,
    testCases,
    mode: "full",
  });

  const mergedMetadata: Prisma.JsonObject & { autoSummary?: JudgeSummary } = {
    ...metadata,
    console: simulation.console,
    cases: simulation.cases,
  };
  if (submission.requiresManualReview) {
    mergedMetadata.autoSummary = simulation.summary;
  }

  const verdictCode = simulation.summary.verdictCode;
  const status =
    verdictCode === "AC" && !submission.requiresManualReview
      ? SubmissionStatus.SUCCEEDED
      : submission.requiresManualReview
        ? SubmissionStatus.MANUAL_PENDING
        : SubmissionStatus.FAILED;

  await prisma.submission.update({
    where: { id: submission.id },
    data: {
      status,
      verdictCode: submission.requiresManualReview ? "MANUAL_PENDING" : simulation.summary.verdictCode,
      finishedAt: simulation.summary.finishedAt,
      timeUsedMs: simulation.summary.runtimeMs,
      memoryUsedKb: simulation.summary.memoryKb,
      metadata: mergedMetadata,
    },
  });

  await prisma.submissionCaseResult.deleteMany({ where: { submissionId: submission.id } });
  await prisma.submissionCaseResult.createMany({
    data: simulation.cases.map((caseResult) => ({
      submissionId: submission.id,
      testOrdinal: caseResult.ordinal,
      verdictCode: caseResult.verdictCode,
      timeMs: caseResult.runtimeMs,
      memoryKb: caseResult.memoryKb,
      stderrRef: caseResult.stderr,
    })),
  });

  if (submission.requiresManualReview) {
    await publishManualMessage({
      submissionId: submission.id,
      problemId: submission.problemId,
      userId: submission.userId,
      reason: "MANUAL_ONLY",
      queuedAt: new Date().toISOString(),
    });
  }
};
