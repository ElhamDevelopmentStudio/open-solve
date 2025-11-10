import { parseProblemSamples } from "@/lib/problems/samples";
import { hashSourceCode } from "@/lib/submissions/hash";
import { simulateSampleRun } from "@/lib/submissions/simulator";
import type { SampleRunResult, SubmissionHistoryEntry } from "@/lib/submissions/types";
import { prisma } from "@/lib/prisma";
import { protectedProcedure, router } from "@/lib/trpc/trpc";
import { Prisma, SubmissionStatus, TestCaseKind } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  dispatchSubmissionToJudge,
  publishManualReviewMessage,
} from "@/lib/judge/dispatcher";
import { getSubmissionDetailForUser, mapTestCases } from "@/lib/submissions/detail";

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

    const requiresManualReview = problem.judgeMode !== "AUTO";
    const manualOnly = problem.judgeMode === "MANUAL";
    const codeHash = hashSourceCode(input.sourceCode);
    const submission = await prisma.submission.create({
      data: {
        userId: ctx.user.id,
        problemId: problem.id,
        problemVersionId: problem.currentVersionId,
        languageCode: language.code,
        status: manualOnly ? SubmissionStatus.MANUAL_PENDING : SubmissionStatus.QUEUED,
        verdictCode: manualOnly ? "MANUAL_PENDING" : null,
        requiresManualReview,
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
        userId: true,
      },
    });

    if (manualOnly) {
      await publishManualReviewMessage({
        submissionId: submission.id,
        problemId: submission.problemId,
        userId: submission.userId,
        reason: "MANUAL_ONLY",
      });
    } else {
      await dispatchSubmissionToJudge({
        submissionId: submission.id,
        problemId: submission.problemId,
        problemVersionId: submission.problemVersionId!,
        languageCode: submission.languageCode,
        requiresManualReview,
        manualOnly: false,
        userId: submission.userId,
      });
    }

    return { submissionId: submission.id };
  }),

  get: protectedProcedure.input(submissionIdSchema).query(async ({ ctx, input }) => {
    const payload = await getSubmissionDetailForUser(input.submissionId, ctx.user.id);
    if (!payload) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Submission not found" });
    }
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
  judgeMode: "AUTO" | "MANUAL" | "HYBRID";
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
      judgeMode: true,
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
