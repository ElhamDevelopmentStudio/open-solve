import { prisma } from "@/lib/prisma";
import { generateUniqueProblemSlug } from "@/lib/problems/slugify";
import { protectedProcedure, router, staffProcedure } from "@/lib/trpc/trpc";
import { ProblemProposalStatus, ProblemState, ProblemVisibility } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

const sampleIO = z.object({
  input: z.string().min(1).max(10_000),
  output: z.string().min(1).max(10_000),
  explanation: z.string().optional().nullable(),
});

export const proposalsRouter = router({
  submit: protectedProcedure
    .input(
      z.object({
        title: z.string().min(8).max(80),
        intendedDifficulty: z.string().min(4).max(20),
        statement: z.string().min(200),
        samples: z.array(sampleIO).min(1),
        originalityConfirmed: z
          .boolean()
          .refine((value) => value, "Originality must be confirmed."),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const activeCount = await prisma.problemProposal.count({
        where: {
          authorId: ctx.user.id,
          status: { in: ["SUBMITTED", "PRESCREEN", "IN_REVIEW", "CHANGES_REQUESTED"] },
        },
      });
      if (activeCount >= 3) {
        throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Proposal quota reached." });
      }

      const slug = await generateUniqueProblemSlug(input.title, async (candidate) => {
        const count = await prisma.problemProposal.count({ where: { slug: candidate } });
        return count > 0;
      });

      const proposal = await prisma.problemProposal.create({
        data: {
          slug,
          title: input.title,
          intendedDifficulty: input.intendedDifficulty,
          statement: input.statement,
          samples: input.samples,
          originalityConfirmed: input.originalityConfirmed,
          authorId: ctx.user.id,
        },
      });

      return proposal;
    }),
  listMine: protectedProcedure.query(async ({ ctx }) => {
    return prisma.problemProposal.findMany({
      where: { authorId: ctx.user.id },
      orderBy: { createdAt: "desc" },
    });
  }),
  get: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const proposal = await prisma.problemProposal.findUnique({
      where: { id: input.id },
      include: {
        comments: {
          orderBy: { createdAt: "asc" },
          include: {
            author: { select: { id: true, name: true, handle: true, role: true } },
          },
        },
      },
    });
    if (!proposal || proposal.authorId !== ctx.user.id) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }
    return proposal;
  }),
  comment: protectedProcedure
    .input(z.object({ proposalId: z.string(), body: z.string().min(5).max(5000) }))
    .mutation(async ({ ctx, input }) => {
      const proposal = await prisma.problemProposal.findUnique({
        where: { id: input.proposalId },
      });
      if (!proposal) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      if (proposal.authorId !== ctx.user.id && ctx.user.role === "USER") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return prisma.problemProposalComment.create({
        data: {
          proposalId: proposal.id,
          authorId: ctx.user.id,
          body: input.body,
        },
      });
    }),
  staffList: staffProcedure
    .input(z.object({ status: z.nativeEnum(ProblemProposalStatus).optional() }).optional())
    .query(async ({ input }) => {
      return prisma.problemProposal.findMany({
        where: { status: input?.status },
        orderBy: { createdAt: "desc" },
        include: {
          author: { select: { id: true, name: true, handle: true } },
          reviewer: { select: { id: true, name: true, handle: true } },
        },
      });
    }),
  staffGet: staffProcedure.input(z.object({ id: z.string() })).query(async ({ input }) => {
    const proposal = await prisma.problemProposal.findUnique({
      where: { id: input.id },
      include: {
        author: { select: { id: true, name: true, handle: true } },
        reviewer: { select: { id: true, name: true, handle: true } },
        comments: {
          orderBy: { createdAt: "asc" },
          include: {
            author: { select: { id: true, name: true, handle: true, role: true } },
          },
        },
      },
    });
    if (!proposal) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }
    return proposal;
  }),
  staffUpdateStatus: staffProcedure
    .input(
      z.object({
        proposalId: z.string(),
        status: z.nativeEnum(ProblemProposalStatus),
        message: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const proposal = await prisma.problemProposal.update({
        where: { id: input.proposalId },
        data: {
          status: input.status,
          reviewerId: ctx.user.id,
        },
      });
      if (input.message) {
        await prisma.problemProposalComment.create({
          data: {
            proposalId: proposal.id,
            authorId: ctx.user.id,
            body: input.message,
          },
        });
      }
      return proposal;
    }),
  convertToDraft: staffProcedure
    .input(z.object({ proposalId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const proposal = await prisma.problemProposal.findUnique({
        where: { id: input.proposalId },
      });
      if (!proposal) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      const slug = await generateUniqueProblemSlug(proposal.title, async (candidate) => {
        const count = await prisma.problem.count({ where: { slug: candidate } });
        return count > 0;
      });

      const problem = await prisma.problem.create({
        data: {
          slug,
          state: ProblemState.DRAFT,
          visibility: ProblemVisibility.INTERNAL,
          authorId: ctx.user.id,
          createdById: ctx.user.id,
          updatedById: ctx.user.id,
          versions: {
            create: {
              versionNumber: 1,
              title: proposal.title,
              statement: proposal.statement,
              constraints: "Constraints pending",
              hints: null,
              editorial: null,
              samples: proposal.samples as Prisma.InputJsonValue,
              createdById: ctx.user.id,
            },
          },
        },
      });

      await prisma.problemProposal.update({
        where: { id: proposal.id },
        data: {
          status: ProblemProposalStatus.ACCEPTED,
          convertedProblemId: problem.id,
        },
      });

      return { problemId: problem.id };
    }),
});
