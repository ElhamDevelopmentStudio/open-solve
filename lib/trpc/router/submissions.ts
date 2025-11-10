import { parseProblemSamples, type ProblemSample } from "@/lib/problems/samples";
import { hashSourceCode } from "@/lib/submissions/hash";
import { enqueueJudgeSimulation } from "@/lib/submissions/judge-runner";
import { simulateSampleRun } from "@/lib/submissions/simulator";
import type {
  SampleRunResult,
  SubmissionDetailPayload,
  SubmissionHistoryEntry,
} from "@/lib/submissions/types";
import { prisma } from "@/lib/prisma";
import { protectedProcedure, router } from "@/lib/trpc/trpc";
import { Prisma, SubmissionStatus, TestCaseKind } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

const codeInputSchema = z.object({
  problemId: z.string().cuid(),
  languageCode: z.string().min(2).max(32),
  sourceCode: z.string().min(8).max(40_000),
  stdin: z.string().max(5_000).optional(),
});

const submissionIdSchema = z.object({
  submissionId: z.string().cuid(),
});

const submissionHistoryInput = z.object({
  problemId: z.string().cuid().optional(),
  limit: z.number().int().min(1).max(50).default(15),
});

const draftSaveSchema = z.object({
  problemId: z.string().cuid(),
  languageCode: z.string().min(2).max(32),
  sourceCode: z.string().min(1).max(80_000),
  cursorOffset: z.number().int().min(0).max(1_000_000).default(0),
  savedVia: z.enum(["autosave", "manual"]).default("autosave"),
});

const draftGetSchema = z.object({
  problemId: z.string().cuid(),
  languageCode: z.string().min(2).max(32),
});

export const submissionsRouter = router({
  runSample: protectedProcedure.input(codeInputSchema).mutation(async ({ ctx, input }) => {
    const [problem, language] = await Promise.all([
      getRunnableProblem(input.problemId),
      ensureLanguage(input.languageCode),
    ]);

    const samples = parseProblemSamples(problem.currentVersion.samples);
    const testCases = mapTestCases(problem.currentVersion.testCases, samples);

    const sampleRun: SampleRunResult = simulateSampleRun({
      problemId: problem.id,
      languageCode: language.code,
      sourceCode: input.sourceCode,
      stdin: input.stdin,
      testCases,
      mode: "sample",
    });

    return sampleRun;
  }),

  create: protectedProcedure.input(codeInputSchema).mutation(async ({ ctx, input }) => {
    const [problem, language] = await Promise.all([
      getRunnableProblem(input.problemId),
      ensureLanguage(input.languageCode),
    ]);

    const codeHash = hashSourceCode(input.sourceCode);
    const submission = await prisma.submission.create({
      data: {
        userId: ctx.user.id,
        problemId: problem.id,
        problemVersionId: problem.currentVersionId,
        languageCode: language.code,
        status: SubmissionStatus.PENDING,
        sourceCodeRef: `inline://submissions/${ctx.user.id}/${Date.now()}`,
        codeHash,
        metadata: {
          sourceCode: input.sourceCode,
          stdin: input.stdin ?? "",
          language: language.displayName,
        },
        createdById: ctx.user.id,
        updatedById: ctx.user.id,
      },
      select: {
        id: true,
        problemId: true,
        problemVersionId: true,
        languageCode: true,
      },
    });

    enqueueJudgeSimulation({
      submissionId: submission.id,
      problemId: submission.problemId,
      problemVersionId: submission.problemVersionId!,
      languageCode: submission.languageCode,
      sourceCode: input.sourceCode,
      stdin: input.stdin,
    });

    return { submissionId: submission.id };
  }),

  get: protectedProcedure.input(submissionIdSchema).query(async ({ ctx, input }) => {
    const submission = await prisma.submission.findFirst({
      where: { id: input.submissionId, userId: ctx.user.id, deletedAt: null },
      include: {
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
      },
    });

    if (!submission) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Submission not found" });
    }

    const metadata = (submission.metadata ?? {}) as Record<string, unknown>;
    const samples = parseProblemSamples(submission.problemVersion?.samples ?? null);
    const testCases = mapTestCases(submission.problemVersion?.testCases ?? [], samples);
    const attachmentCases = Array.isArray(metadata.cases)
      ? ((metadata.cases ?? []) as Array<{
          ordinal: number;
          actualOutput?: string | null;
          inputPreview?: string | null;
          expectedOutput?: string | null;
          stderr?: string | null;
        }>)
      : [];

    const caseResults = submission.caseResults.map((result) => {
      const testCase = testCases.find((test) => test.ordinal === result.testOrdinal);
      const attachment = attachmentCases.find((entry) => entry.ordinal === result.testOrdinal);
      return {
        ordinal: result.testOrdinal,
        verdictCode: result.verdictCode ?? "WA",
        status:
          result.verdictCode === "AC"
            ? "PASSED"
            : result.verdictCode === "CE" || result.verdictCode === "RE"
              ? "ERROR"
              : "FAILED",
        runtimeMs: result.timeMs ?? 0,
        memoryKb: result.memoryKb ?? 0,
        inputPreview: attachment?.inputPreview ?? testCase?.input ?? null,
        expectedOutput: attachment?.expectedOutput ?? testCase?.output ?? null,
        actualOutput: attachment?.actualOutput ?? null,
        stderr: attachment?.stderr ?? result.stderrRef ?? null,
        hidden: testCase?.kind === "HIDDEN",
      };
    });

    const summary = buildSummary(caseResults, submission);

    const consoleMessages = Array.isArray(metadata.console)
      ? ((metadata.console as string[]) ?? [])
      : [];

    const payload: SubmissionDetailPayload = {
      id: submission.id,
      problemId: submission.problemId,
      languageCode: submission.languageCode,
      sourceCode: typeof metadata.sourceCode === "string" ? (metadata.sourceCode as string) : "",
      stdin: typeof metadata.stdin === "string" ? (metadata.stdin as string) : undefined,
      status: submission.status as SubmissionDetailPayload["status"],
      verdictCode: submission.verdictCode as SubmissionDetailPayload["verdictCode"],
      summary,
      cases: caseResults,
      console: consoleMessages,
      createdAt: submission.createdAt,
      startedAt: submission.startedAt,
      finishedAt: submission.finishedAt,
    };

    return payload;
  }),

  listMine: protectedProcedure.input(submissionHistoryInput).query(async ({ ctx, input }) => {
    const submissions = await prisma.submission.findMany({
      where: {
        userId: ctx.user.id,
        deletedAt: null,
        problemId: input.problemId ?? undefined,
      },
      orderBy: { createdAt: "desc" },
      take: input.limit,
      select: {
        id: true,
        createdAt: true,
        verdictCode: true,
        status: true,
        timeUsedMs: true,
        languageCode: true,
      },
    });

    const entries: SubmissionHistoryEntry[] = submissions.map((submission) => ({
      id: submission.id,
      createdAt: submission.createdAt,
      verdictCode: (submission.verdictCode as SubmissionHistoryEntry["verdictCode"]) ?? null,
      status: submission.status as SubmissionHistoryEntry["status"],
      runtimeMs: submission.timeUsedMs,
      languageCode: submission.languageCode,
    }));

    return { entries };
  }),

  saveDraft: protectedProcedure.input(draftSaveSchema).mutation(async ({ ctx, input }) => {
    await getRunnableProblem(input.problemId);
    await ensureLanguage(input.languageCode);
    const draft = await prisma.submissionDraft.create({
      data: {
        userId: ctx.user.id,
        problemId: input.problemId,
        languageCode: input.languageCode,
        sourceCode: input.sourceCode,
        cursorOffset: input.cursorOffset,
        savedVia: input.savedVia,
        sourceHash: hashSourceCode(input.sourceCode),
      },
    });

    await pruneDrafts(ctx.user.id, input.problemId, input.languageCode);

    return draft;
  }),

  getDrafts: protectedProcedure.input(draftGetSchema).query(async ({ ctx, input }) => {
    const drafts = await prisma.submissionDraft.findMany({
      where: {
        userId: ctx.user.id,
        problemId: input.problemId,
        languageCode: input.languageCode,
      },
      orderBy: { createdAt: "desc" },
      take: 3,
    });

    return drafts;
  }),
});

type RunnableProblem = {
  id: string;
  slug: string;
  currentVersionId: string;
  currentVersion: {
    id: string;
    samples: Prisma.JsonValue | null;
    testCases: Array<{ ordinal: number; kind: TestCaseKind }>;
  };
};

async function getRunnableProblem(problemId: string): Promise<RunnableProblem> {
  const problem = await prisma.problem.findFirst({
    where: {
      id: problemId,
      state: "PUBLISHED",
      visibility: "PUBLIC",
      deletedAt: null,
    },
    select: {
      id: true,
      slug: true,
      currentVersionId: true,
      currentVersion: {
        select: {
          id: true,
          samples: true,
          testCases: {
            select: {
              ordinal: true,
              kind: true,
            },
            orderBy: { ordinal: "asc" },
          },
        },
      },
    },
  });

  if (!problem || !problem.currentVersionId || !problem.currentVersion) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Problem is not available for submissions",
    });
  }

  return problem as RunnableProblem;
}

async function ensureLanguage(languageCode: string) {
  const language = await prisma.language.findFirst({
    where: { code: languageCode, isEnabled: true, deletedAt: null },
    select: { code: true, displayName: true },
  });
  if (!language) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Unsupported language" });
  }
  return language;
}

function mapTestCases(
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

function buildSummary(
  cases: SubmissionDetailPayload["cases"],
  submission: Prisma.SubmissionGetPayload<{
    include: { caseResults: true };
  }>,
) {
  if (cases.length === 0 && submission.status !== SubmissionStatus.COMPLETED) {
    return null;
  }
  const passed = cases.filter((item) => item.status === "PASSED").length;
  const failed = cases.filter((item) => item.status === "FAILED").length;
  const errored = cases.filter((item) => item.status === "ERROR").length;
  return {
    verdictCode: submission.verdictCode ?? (cases.length && cases.every((c) => c.verdictCode === "AC") ? "AC" : "WA"),
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

async function pruneDrafts(userId: string, problemId: string, languageCode: string) {
  const drafts = await prisma.submissionDraft.findMany({
    where: { userId, problemId, languageCode },
    orderBy: { createdAt: "desc" },
    skip: 3,
    take: 10,
    select: { id: true },
  });
  if (drafts.length === 0) return;
  await prisma.submissionDraft.deleteMany({
    where: { id: { in: drafts.map((draft) => draft.id) } },
  });
}
