import { prisma } from "@/lib/prisma";
import { adminProcedure, router } from "@/lib/trpc/trpc";
import { z } from "zod";
import { DiscussionState } from "@prisma/client";
import type { Prisma } from "@prisma/client";

const listThreadsInput = z
  .object({
    query: z.string().max(120).optional(),
    state: z.array(z.nativeEnum(DiscussionState)).optional(),
    limit: z.number().int().min(10).max(100).default(25),
  })
  .optional();

const threadIdInput = z.object({ discussionId: z.string().cuid() });

export const adminDiscussionsRouter = router({
  listThreads: adminProcedure.input(listThreadsInput).query(async ({ input }) => {
    const where: Prisma.DiscussionWhereInput = {
      parentId: null,
      ...(input?.state && input.state.length > 0 ? { state: { in: input.state } } : {}),
      ...(input?.query
        ? {
            OR: [
              { title: { contains: input.query, mode: "insensitive" } },
              { content: { contains: input.query, mode: "insensitive" } },
              {
                problem: {
                  is: {
                    slug: { contains: input.query, mode: "insensitive" },
                  },
                },
              },
              {
                author: {
                  is: { handle: { contains: input.query, mode: "insensitive" } },
                },
              },
            ],
          }
        : {}),
    };
    const items = await prisma.discussion.findMany({
      where,
      orderBy: [{ lastActivityAt: "desc" }, { createdAt: "desc" }],
      take: input?.limit ?? 25,
      include: {
        author: { select: { id: true, handle: true, role: true, status: true } },
        problem: {
          select: {
            slug: true,
            currentVersion: { select: { title: true } },
          },
        },
        _count: {
          select: {
            replies: true,
            reports: true,
          },
        },
      },
    });
    return items;
  }),
  hideThread: adminProcedure.input(threadIdInput).mutation(async ({ input }) => {
    await prisma.discussion.update({
      where: { id: input.discussionId },
      data: { state: "HIDDEN" },
    });
    return { ok: true };
  }),
  unhideThread: adminProcedure.input(threadIdInput).mutation(async ({ input }) => {
    await prisma.discussion.update({
      where: { id: input.discussionId },
      data: { state: "VISIBLE" },
    });
    return { ok: true };
  }),
  lockThread: adminProcedure
    .input(
      z.object({
        discussionId: z.string().cuid(),
        locked: z.boolean(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await prisma.discussion.update({
        where: { id: input.discussionId },
        data: {
          isLocked: input.locked,
          lockedAt: input.locked ? new Date() : null,
          lockedById: input.locked ? ctx.user?.id : null,
        },
      });
      return { ok: true };
    }),
  deleteThread: adminProcedure.input(threadIdInput).mutation(async ({ input }) => {
    await prisma.discussion.update({
      where: { id: input.discussionId },
      data: { state: "REMOVED", deletedAt: new Date() },
    });
    return { ok: true };
  }),
  listReports: adminProcedure
    .input(
      z
        .object({
          status: z.enum(["OPEN", "VALID", "INVALID"]).optional(),
          limit: z.number().int().min(5).max(100).default(25),
        })
        .optional(),
    )
    .query(({ input }) =>
      prisma.discussionReport.findMany({
        where: { status: input?.status },
        orderBy: { createdAt: "desc" },
        take: input?.limit ?? 25,
        include: {
          discussion: {
            select: {
              id: true,
              title: true,
              state: true,
            },
          },
          reporter: { select: { id: true, handle: true } },
        },
      }),
    ),
  resolveReport: adminProcedure
    .input(
      z.object({
        reportId: z.string().cuid(),
        status: z.enum(["OPEN", "VALID", "INVALID"]),
        note: z.string().max(400).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await prisma.discussionReport.update({
        where: { id: input.reportId },
        data: {
          status: input.status,
          note: input.note,
          resolvedById: ctx.user?.id,
          resolvedAt: new Date(),
        },
      });
      return { ok: true };
    }),
  shadowBanAuthor: adminProcedure.input(threadIdInput).mutation(async ({ input }) => {
    const discussion = await prisma.discussion.findUnique({
      where: { id: input.discussionId },
      select: { authorId: true },
    });
    if (!discussion) {
      throw new Error("Discussion not found");
    }
    await prisma.user.update({
      where: { id: discussion.authorId },
      data: { status: "SHADOW_BANNED" },
    });
    return { ok: true };
  }),
});
