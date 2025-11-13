import { router, publicProcedure, protectedProcedure } from "@/lib/trpc/trpc";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  listProblemThreads,
  listGlobalThreads,
  getThread,
  listReplies,
  createThread,
  createReply,
  voteOnPost,
  reportDiscussion,
} from "@/lib/discussions/service";
import type { DiscussionViewer } from "@/lib/discussions/types";
import { TRPCError } from "@trpc/server";

const sortEnum = z.enum(["top", "recent", "unanswered"]);
const tabEnum = z.enum(["trending", "latest", "help", "meta"]);
const voteEnum = z.enum(["UP", "DOWN"]);
const reportEnum = z.enum(["SPAM", "ABUSE", "SPOILER_ABUSE", "OFF_TOPIC"]);

const viewerFromCtx = (user?: { id: string; role: string; status: string } | null): DiscussionViewer | undefined =>
  user
    ? {
        id: user.id,
        role: user.role as DiscussionViewer["role"],
        status: user.status as DiscussionViewer["status"],
      }
    : undefined;

async function resolveProblemId(slug: string) {
  const problem = await prisma.problem.findUnique({ where: { slug }, select: { id: true } });
  if (!problem) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Problem not found" });
  }
  return problem.id;
}

export const discussionsRouter = router({
  listByProblem: publicProcedure
    .input(
      z.object({
        slug: z.string().min(1),
        sort: sortEnum.default("top"),
        cursor: z.string().nullish(),
      }),
    )
    .query(async ({ input, ctx }) => {
      const problemId = await resolveProblemId(input.slug);
      return listProblemThreads({
        problemId,
        sort: input.sort,
        cursor: input.cursor,
        viewer: viewerFromCtx(ctx.user),
      });
    }),
  listGlobal: publicProcedure
    .input(
      z.object({
        tab: tabEnum.default("trending"),
        tags: z.array(z.string()).max(5).optional(),
        difficulty: z.array(z.string()).max(3).optional(),
        cursor: z.string().nullish(),
      }),
    )
    .query(({ input, ctx }) =>
      listGlobalThreads({
        tab: input.tab,
        tags: input.tags,
        difficulty: input.difficulty,
        cursor: input.cursor,
        viewer: viewerFromCtx(ctx.user),
      }),
    ),
  thread: publicProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(({ input, ctx }) => getThread(input.id, viewerFromCtx(ctx.user))),
  replies: publicProcedure
    .input(z.object({ threadId: z.string().cuid(), cursor: z.string().nullish() }))
    .query(({ input, ctx }) =>
      listReplies({
        threadId: input.threadId,
        cursor: input.cursor,
        viewer: viewerFromCtx(ctx.user),
      }),
    ),
  createThread: protectedProcedure
    .input(
      z.object({
        slug: z.string().optional(),
        problemId: z.string().cuid().optional(),
        title: z.string().min(4).max(140),
        content: z.string().min(8),
        containsSpoiler: z.boolean().default(false),
        tags: z.array(z.string()).max(5).optional(),
        category: tabEnum.optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const problemId = input.problemId ?? (input.slug ? await resolveProblemId(input.slug) : null);
      if (!problemId && input.category === undefined) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Category is required" });
      }
      return createThread({
        problemId,
        authorId: ctx.user.id,
        title: input.title,
        content: input.content,
        containsSpoiler: input.containsSpoiler,
        tags: input.tags,
        category: input.category,
        viewerStatus: { id: ctx.user.id, role: ctx.user.role, status: ctx.user.status },
      });
    }),
  reply: protectedProcedure
    .input(
      z.object({
        threadId: z.string().cuid(),
        parentId: z.string().cuid().optional(),
        content: z.string().min(2),
        containsSpoiler: z.boolean().default(false),
      }),
    )
    .mutation(({ input, ctx }) =>
      createReply({
        threadId: input.threadId,
        parentId: input.parentId,
        content: input.content,
        containsSpoiler: input.containsSpoiler,
        authorId: ctx.user.id,
        viewerStatus: { id: ctx.user.id, role: ctx.user.role, status: ctx.user.status },
      }),
    ),
  vote: protectedProcedure
    .input(z.object({ discussionId: z.string().cuid(), direction: voteEnum }))
    .mutation(({ input, ctx }) => voteOnPost({ discussionId: input.discussionId, userId: ctx.user.id, direction: input.direction })),
  report: protectedProcedure
    .input(z.object({ discussionId: z.string().cuid(), reason: reportEnum, note: z.string().max(500).optional() }))
    .mutation(({ input, ctx }) => reportDiscussion({ discussionId: input.discussionId, reporterId: ctx.user.id, reason: input.reason, note: input.note })),
});
