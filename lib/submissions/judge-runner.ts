import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { parseProblemSamples } from "@/lib/problems/samples";
import { simulateJudgeRun } from "@/lib/submissions/simulator";
import type { JudgeSimulationTestCase } from "@/lib/submissions/types";
import { SubmissionStatus, TestCaseKind } from "@prisma/client";

type JudgeParams = {
  submissionId: string;
  problemId: string;
  problemVersionId: string;
  languageCode: string;
  sourceCode: string;
  stdin?: string;
};

export function enqueueJudgeSimulation(params: JudgeParams) {
  setTimeout(() => {
    void runJudgeSimulation(params).catch((error) => {
      logger.error(
        {
          submissionId: params.submissionId,
          error: error instanceof Error ? error.message : error,
        },
        "judge simulation failed",
      );
    });
  }, 300);
}

async function runJudgeSimulation({
  submissionId,
  problemId,
  problemVersionId,
  languageCode,
  sourceCode,
  stdin,
}: JudgeParams) {
  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    select: { id: true, metadata: true },
  });
  if (!submission) {
    return;
  }

  await prisma.submission.update({
    where: { id: submissionId },
    data: {
      status: SubmissionStatus.RUNNING,
      startedAt: new Date(),
    },
  });

  const [version, rawTests] = await Promise.all([
    prisma.problemVersion.findUnique({
      where: { id: problemVersionId },
      select: { samples: true },
    }),
    prisma.testCase.findMany({
      where: { problemVersionId },
      orderBy: { ordinal: "asc" },
      select: {
        ordinal: true,
        kind: true,
      },
    }),
  ]);

  const sampleMap = new Map<number, { input: string; output: string }>();
  const parsedSamples = parseProblemSamples(version?.samples ?? null);
  let sampleCursor = 0;
  for (const test of rawTests) {
    if (test.kind === TestCaseKind.SAMPLE) {
      const sample = parsedSamples[sampleCursor];
      if (sample) {
        sampleMap.set(test.ordinal, { input: sample.input, output: sample.output });
      }
      sampleCursor += 1;
    }
  }

  const testCases: JudgeSimulationTestCase[] = rawTests.map((test) => {
    const fallbackLabel =
      test.kind === TestCaseKind.SAMPLE
        ? `Sample #${test.ordinal}`
        : `Hidden test #${test.ordinal}`;
    const sample = sampleMap.get(test.ordinal);
    return {
      ordinal: test.ordinal,
      kind: test.kind,
      input: sample?.input ?? fallbackLabel,
      output: sample?.output ?? (test.kind === TestCaseKind.SAMPLE ? "" : fallbackLabel),
    };
  });

  const simulation = simulateJudgeRun({
    problemId,
    languageCode,
    sourceCode,
    stdin,
    testCases,
    mode: "full",
  });

  const metadata = {
    ...(submission.metadata ?? {}),
    console: simulation.console,
    cases: simulation.cases,
  };

  await prisma.submission.update({
    where: { id: submissionId },
    data: {
      status: SubmissionStatus.COMPLETED,
      verdictCode: simulation.summary.verdictCode,
      finishedAt: simulation.summary.finishedAt,
      timeUsedMs: simulation.summary.runtimeMs,
      memoryUsedKb: simulation.summary.memoryKb,
      metadata,
    },
  });

  await prisma.submissionCaseResult.createMany({
    data: simulation.cases.map((caseResult) => ({
      submissionId,
      testOrdinal: caseResult.ordinal,
      verdictCode: caseResult.verdictCode,
      timeMs: caseResult.runtimeMs,
      memoryKb: caseResult.memoryKb,
      stderrRef: caseResult.stderr,
    })),
  });
}
