import { adminProcedure, router } from "@/lib/trpc/trpc";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { contestBuilderSchema, contestProblemSettingsSchema } from "@/lib/contests/schema";
import {
  createContestFromBuilder,
  listContestClarifications,
  respondToContestClarification,
} from "@/lib/contests/service";
import bcrypt from "bcryptjs";
import { ClarificationStatus, ClarificationVisibility } from "@prisma/client";

export const staffContestsRouter = router({
  list: adminProcedure.query(async () => {
    return prisma.contest.findMany({
      where: { deletedAt: null },
      orderBy: { startsAt: "desc" },
      include: {
        _count: { select: { problems: true, registrations: true } },
      },
    });
  }),
  problemCatalog: adminProcedure
    .input(
      z
        .object({
          query: z.string().optional(),
          take: z.number().int().min(5).max(100).optional(),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      return prisma.problem.findMany({
        where: {
          deletedAt: null,
          state: "PUBLISHED",
          slug: input?.query
            ? {
                contains: input.query,
                mode: "insensitive",
              }
            : undefined,
        },
        take: input?.take ?? 50,
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          slug: true,
          difficulty: { select: { code: true } },
          currentVersion: { select: { title: true } },
          tags: { select: { tag: { select: { name: true } } } },
        },
      });
    }),
  create: adminProcedure.input(contestBuilderSchema).mutation(async ({ ctx, input }) => {
    let settingsPatch = input.settings;
    const accessCode = input.settings?.registration?.accessCodeHash;
    if (accessCode) {
      const hashed = await bcrypt.hash(accessCode, 10);
      settingsPatch = {
        ...settingsPatch,
        registration: {
          ...settingsPatch?.registration,
          accessCodeHash: hashed,
        },
      };
    }
    return createContestFromBuilder(
      {
        ...input,
        settings: settingsPatch,
      },
      ctx.user.id,
    );
  }),
  clarifications: adminProcedure
    .input(
      z.object({
        contestId: z.string(),
        status: z.nativeEnum(ClarificationStatus).optional(),
      }),
    )
    .query(({ ctx, input }) =>
      listContestClarifications({
        contestId: input.contestId,
        viewerRole: ctx.user.role,
        viewerId: ctx.user.id,
        status: input.status,
      }),
    ),
  answerClarification: adminProcedure
    .input(
      z.object({
        contestId: z.string(),
        clarificationId: z.string(),
        answer: z.string().min(1),
        visibility: z.nativeEnum(ClarificationVisibility),
        status: z.nativeEnum(ClarificationStatus).optional(),
      }),
    )
    .mutation(({ ctx, input }) =>
      respondToContestClarification({
        clarificationId: input.clarificationId,
        contestId: input.contestId,
        answeredById: ctx.user.id,
        answer: input.answer,
        visibility: input.visibility,
        status: input.status,
      }),
    ),
});
