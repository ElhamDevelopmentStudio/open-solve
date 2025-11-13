import { prisma } from "@/lib/prisma";
import { isStaffRole } from "@/lib/auth/permissions";
import type {
  PaginatedDiscussions,
  PaginatedReplies,
  DiscussionSort,
  DiscussionFeedTab,
  DiscussionViewer,
  DiscussionThread,
  DiscussionReply,
} from "@/lib/discussions/types";
import type { DiscussionCategory, DiscussionState, DiscussionReportReason, Prisma } from "@prisma/client";
import { TRPCError } from "@trpc/server";

const THREAD_PAGE_SIZE = 20;
const REPLY_PAGE_SIZE = 30;

const authorSelect = {
  id: true,
  handle: true,
  name: true,
  avatarUrl: true,
  role: true,
  status: true,
} satisfies Prisma.UserSelect;

const threadInclude = (viewer?: DiscussionViewer) => ({
  author: { select: authorSelect },
  problem: {
    select: {
      slug: true,
      currentVersion: { select: { title: true } },
      difficulty: { select: { code: true } },
    },
  },
  tags: {
    include: {
      tag: { select: { slug: true, name: true } },
    },
  },
  votes: viewer
    ? {
        where: { userId: viewer.id },
        select: { value: true },
      }
    : false,
}) satisfies Prisma.DiscussionInclude;

const replyInclude = (viewer?: DiscussionViewer) => ({
  author: { select: authorSelect },
  votes: viewer
    ? {
        where: { userId: viewer.id },
        select: { value: true },
      }
    : false,
}) satisfies Prisma.DiscussionInclude;

const baseVisibleFilter = (viewer?: DiscussionViewer): Prisma.DiscussionWhereInput => {
  if (viewer && isStaffRole(viewer.role)) {
    return { state: { not: "REMOVED" } };
  }
  if (viewer) {
    return {
      OR: [{ state: "VISIBLE" }, { authorId: viewer.id }],
      NOT: { state: "REMOVED" },
    };
  }
  return { state: "VISIBLE" };
};

const mapThread = (thread: Prisma.DiscussionGetPayload<{ include: ReturnType<typeof threadInclude> }>, viewer?: DiscussionViewer) => {
  const viewerVote: -1 | 0 | 1 = thread.votes?.[0]?.value === 1 ? 1 : thread.votes?.[0]?.value === -1 ? -1 : 0;
  return {
    id: thread.id,
    title: thread.title,
    content: thread.content,
    author: thread.author,
    score: thread.score,
    replyCount: thread.replyCount,
    containsSpoiler: thread.containsSpoiler,
    isPinned: thread.isPinned,
    isLocked: thread.isLocked,
    state: thread.state,
    category: thread.category,
    tags: thread.tags.map((tag) => ({ slug: tag.tag.slug, name: tag.tag.name })),
    createdAt: thread.createdAt,
    lastActivityAt: thread.lastActivityAt,
    problem: thread.problem
      ? {
          slug: thread.problem.slug,
          title: thread.problem.currentVersion?.title ?? "",
          difficulty: thread.problem.difficulty?.code ?? null,
        }
      : null,
    viewer: viewer
      ? {
          canModerate: isStaffRole(viewer.role),
          canEdit: viewer.id === thread.authorId || isStaffRole(viewer.role),
          vote: viewerVote,
        }
      : undefined,
  } satisfies DiscussionThread;
};

const mapReply = (reply: Prisma.DiscussionGetPayload<{ include: ReturnType<typeof replyInclude> }>, viewer?: DiscussionViewer) => {
  const viewerVote: -1 | 0 | 1 = reply.votes?.[0]?.value === 1 ? 1 : reply.votes?.[0]?.value === -1 ? -1 : 0;
  return {
    id: reply.id,
    parentId: reply.parentId!,
    content: reply.content,
    author: reply.author,
    score: reply.score,
    containsSpoiler: reply.containsSpoiler,
    state: reply.state,
    createdAt: reply.createdAt,
    viewer: viewer
      ? {
          canModerate: isStaffRole(viewer.role),
          canEdit: viewer.id === reply.authorId || isStaffRole(viewer.role),
          vote: viewerVote,
        }
      : undefined,
  } satisfies DiscussionReply;
};

const threadSortToOrder: Record<DiscussionSort, Prisma.DiscussionOrderByWithRelationInput[]> = {
  top: [
    { isPinned: "desc" },
    { score: "desc" },
    { createdAt: "desc" },
  ],
  recent: [
    { isPinned: "desc" },
    { lastActivityAt: "desc" },
    { createdAt: "desc" },
  ],
  unanswered: [
    { isPinned: "desc" },
    { replyCount: "asc" },
    { createdAt: "desc" },
  ],
};

const feedOrder: Record<DiscussionFeedTab, Prisma.DiscussionOrderByWithRelationInput[]> = {
  trending: [
    { score: "desc" },
    { lastActivityAt: "desc" },
  ],
  latest: [{ createdAt: "desc" }],
  help: [{ createdAt: "desc" }],
  meta: [{ createdAt: "desc" }],
};

const sanitizeContent = (content: string) => {
  const value = content.trim();
  if (!value) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Content is required" });
  }
  if (value.length > 4000) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Content exceeds 4000 characters" });
  }
  return value;
};

export async function listProblemThreads(params: {
  problemId: string;
  sort: DiscussionSort;
  cursor?: string | null;
  limit?: number;
  viewer?: DiscussionViewer;
}): Promise<PaginatedDiscussions> {
  const take = Math.min(params.limit ?? THREAD_PAGE_SIZE, 50);
  const where: Prisma.DiscussionWhereInput = {
    problemId: params.problemId,
    parentId: null,
    ...baseVisibleFilter(params.viewer),
  };
  const discussions = await prisma.discussion.findMany({
    where,
    take: take + 1,
    orderBy: threadSortToOrder[params.sort],
    include: threadInclude(params.viewer),
    cursor: params.cursor ? { id: params.cursor } : undefined,
    skip: params.cursor ? 1 : 0,
  });
  const items = discussions.slice(0, take).map((item) => mapThread(item, params.viewer));
  const nextCursor = discussions.length > take ? discussions[take].id : null;
  return { items, nextCursor };
}

export async function listGlobalThreads(params: {
  tab: DiscussionFeedTab;
  tags?: string[];
  category?: DiscussionFeedTab;
  difficulty?: string[];
  cursor?: string | null;
  limit?: number;
  viewer?: DiscussionViewer;
}): Promise<PaginatedDiscussions> {
  const take = Math.min(params.limit ?? THREAD_PAGE_SIZE, 50);
  const where: Prisma.DiscussionWhereInput = {
    problemId: null,
    parentId: null,
    ...baseVisibleFilter(params.viewer),
  };
  if (params.tab === "help") {
    where.category = "HELP";
  } else if (params.tab === "meta") {
    where.category = "META";
  }
  if (params.tags && params.tags.length > 0) {
    where.tags = {
      some: {
        tag: { slug: { in: params.tags } },
      },
    };
  }
  if (params.difficulty && params.difficulty.length > 0) {
    where.problemId = { not: null };
    where.problem = {
      difficulty: {
        code: { in: params.difficulty },
      },
    };
  }
  const records = await prisma.discussion.findMany({
    where,
    take: take + 1,
    orderBy: feedOrder[params.tab],
    include: threadInclude(params.viewer),
    cursor: params.cursor ? { id: params.cursor } : undefined,
    skip: params.cursor ? 1 : 0,
  });
  const items = records.slice(0, take).map((item) => mapThread(item, params.viewer));
  const nextCursor = records.length > take ? records[take].id : null;
  return { items, nextCursor };
}

export async function getThread(threadId: string, viewer?: DiscussionViewer) {
  const thread = await prisma.discussion.findFirst({
    where: {
      id: threadId,
      parentId: null,
      ...baseVisibleFilter(viewer),
    },
    include: threadInclude(viewer),
  });
  if (!thread) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Thread not found" });
  }
  return mapThread(thread, viewer);
}

export async function listReplies(params: {
  threadId: string;
  cursor?: string | null;
  limit?: number;
  viewer?: DiscussionViewer;
}): Promise<PaginatedReplies> {
  const take = Math.min(params.limit ?? REPLY_PAGE_SIZE, 100);
  const where: Prisma.DiscussionWhereInput = {
    parentId: params.threadId,
    ...baseVisibleFilter(params.viewer),
  };
  const replies = await prisma.discussion.findMany({
    where,
    orderBy: [{ createdAt: "asc" }],
    include: replyInclude(params.viewer),
    take: take + 1,
    cursor: params.cursor ? { id: params.cursor } : undefined,
    skip: params.cursor ? 1 : 0,
  });
  const items = replies.slice(0, take).map((reply) => mapReply(reply, params.viewer));
  const nextCursor = replies.length > take ? replies[take].id : null;
  return { items, nextCursor };
}

export async function createThread(params: {
  problemId?: string | null;
  authorId: string;
  title: string;
  content: string;
  containsSpoiler: boolean;
  tags?: string[];
  category?: DiscussionFeedTab;
  viewerStatus: DiscussionViewer;
}) {
  const content = sanitizeContent(params.content);
  const title = params.title.trim();
  if (!title) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Title is required" });
  }
  const category = params.problemId ? null : mapTabToCategory(params.category);
  if (!params.problemId && !category) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Category is required" });
  }
  const created = await prisma.$transaction(async (tx) => {
    const thread = await tx.discussion.create({
      data: {
        authorId: params.authorId,
        problemId: params.problemId ?? null,
        title,
        content,
        containsSpoiler: params.containsSpoiler,
        category,
        state: params.viewerStatus.status === "SHADOW_BANNED" ? "HIDDEN" : "VISIBLE",
        lastActivityAt: new Date(),
      },
      include: threadInclude(params.viewerStatus),
    });
    if (params.tags && params.tags.length > 0) {
      const tags = await tx.tag.findMany({ where: { slug: { in: params.tags } }, select: { id: true, slug: true } });
      if (tags.length === 0) {
        return thread;
      }
      await tx.discussionTag.createMany({
        data: tags.map((tag) => ({ discussionId: thread.id, tagId: tag.id })),
        skipDuplicates: true,
      });
    }
    return tx.discussion.findUniqueOrThrow({ where: { id: thread.id }, include: threadInclude(params.viewerStatus) });
  });
  return mapThread(created, params.viewerStatus);
}

export async function createReply(params: {
  threadId: string;
  parentId?: string;
  authorId: string;
  content: string;
  containsSpoiler: boolean;
  viewerStatus: DiscussionViewer;
}) {
  const thread = await prisma.discussion.findUnique({ where: { id: params.threadId } });
  if (!thread || thread.parentId) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Thread not found" });
  }
  if (thread.isLocked && !isStaffRole(params.viewerStatus.role)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Thread is locked" });
  }
  if (params.parentId && params.parentId !== params.threadId) {
    const parent = await prisma.discussion.findFirst({
      where: {
        id: params.parentId,
        OR: [{ id: thread.id }, { parentId: thread.id }],
      },
    });
    if (!parent) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Parent reply not found" });
    }
    if (parent.parentId && parent.parentId !== thread.id) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Reply depth exceeded" });
    }
  }
  const content = sanitizeContent(params.content);
  const parentId = params.parentId ?? params.threadId;
  const reply = await prisma.$transaction(async (tx) => {
    const created = await tx.discussion.create({
      data: {
        authorId: params.authorId,
        problemId: thread.problemId,
        parentId,
        content,
        containsSpoiler: params.containsSpoiler,
        state: params.viewerStatus.status === "SHADOW_BANNED" ? "HIDDEN" : "VISIBLE",
      },
      include: replyInclude(params.viewerStatus),
    });
    await tx.discussion.update({
      where: { id: thread.id },
      data: {
        replyCount: { increment: 1 },
        lastActivityAt: new Date(),
      },
    });
    return created;
  });
  return mapReply(reply, params.viewerStatus);
}

export async function voteOnPost(params: {
  discussionId: string;
  userId: string;
  direction: "UP" | "DOWN";
}) {
  const value = params.direction === "UP" ? 1 : -1;
  const existing = await prisma.vote.findUnique({
    where: {
      discussionId_userId: {
        discussionId: params.discussionId,
        userId: params.userId,
      },
    },
  });
  const delta = existing ? (existing.value === value ? -value : value - existing.value) : value;
  const compound = { discussionId: params.discussionId, userId: params.userId } as const;
  await prisma.$transaction([
    existing
      ? existing.value === value
        ? prisma.vote.delete({ where: { discussionId_userId: compound } })
        : prisma.vote.update({
            where: { discussionId_userId: compound },
            data: { value },
          })
      : prisma.vote.create({ data: { discussionId: params.discussionId, userId: params.userId, value } }),
    prisma.discussion.update({
      where: { id: params.discussionId },
      data: { score: { increment: delta } },
    }),
  ]);
}

export async function reportDiscussion(params: {
  discussionId: string;
  reporterId: string;
  reason: DiscussionReportReason;
  note?: string;
}) {
  await prisma.discussionReport.create({
    data: {
      discussionId: params.discussionId,
      reporterId: params.reporterId,
      reason: params.reason,
      note: params.note?.trim() || null,
    },
  });
}

export async function getThreadRepliesTree(threadId: string, viewer?: DiscussionViewer) {
  const replies = await prisma.discussion.findMany({
    where: {
      AND: [{ parentId: threadId }, baseVisibleFilter(viewer)],
    },
    orderBy: { createdAt: "asc" },
    include: {
      author: { select: authorSelect },
      votes: viewer
        ? {
            where: { userId: viewer.id },
            select: { value: true },
          }
        : false,
      replies: {
        where: baseVisibleFilter(viewer),
        include: replyInclude(viewer),
        orderBy: { createdAt: "asc" },
      },
    },
  });
  return replies.map((reply) => ({
    ...mapReply(reply, viewer),
    replies: reply.replies?.map((child) => mapReply(child, viewer)) ?? [],
  }));
}

const mapTabToCategory = (tab?: DiscussionFeedTab): DiscussionCategory => {
  switch (tab) {
    case "help":
      return "HELP";
    case "meta":
      return "META";
    case "trending":
    case "latest":
    default:
      return "GENERAL";
  }
};

export async function updateDiscussionState(params: { discussionId: string; state: DiscussionState }) {
  await prisma.discussion.update({ where: { id: params.discussionId }, data: { state: params.state } });
}

export async function setThreadLock(params: { threadId: string; locked: boolean; moderatorId: string }) {
  const data = params.locked
    ? { isLocked: true, lockedAt: new Date(), lockedById: params.moderatorId }
    : { isLocked: false, lockedAt: null, lockedById: null };
  await prisma.discussion.update({ where: { id: params.threadId }, data });
}

export async function resolveDiscussionReportAction(params: {
  reportId: string;
  status: "OPEN" | "VALID" | "INVALID";
  note?: string;
  resolverId: string;
}) {
  await prisma.discussionReport.update({
    where: { id: params.reportId },
    data: {
      status: params.status,
      note: params.note?.trim() || null,
      resolvedById: params.resolverId,
      resolvedAt: new Date(),
    },
  });
}

export async function shadowBanUser(userId: string) {
  await prisma.user.update({ where: { id: userId }, data: { status: "SHADOW_BANNED" } });
}
