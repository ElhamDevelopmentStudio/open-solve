import { prisma } from "@/lib/prisma";
import { adminProcedure, router } from "@/lib/trpc/trpc";
import { createAuditLog } from "@/lib/auth/audit";
import { deleteAllUserSessions } from "@/lib/auth/session";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { Prisma, UserRole, UserStatus } from "@prisma/client";

const listUsersInput = z.object({
  query: z.string().max(80).optional(),
  role: z.nativeEnum(UserRole).optional(),
  status: z.nativeEnum(UserStatus).optional(),
  limit: z.number().int().min(10).max(100).default(25),
  cursor: z.string().cuid().optional(),
  sort: z.enum(["recent", "activity"]).default("recent"),
});

const updateRoleInput = z.object({
  userId: z.string().cuid(),
  role: z.nativeEnum(UserRole),
});

const updateStatusInput = z.object({
  userId: z.string().cuid(),
  status: z.nativeEnum(UserStatus),
  reason: z.string().max(200).optional(),
});

const simpleUserId = z.object({
  userId: z.string().cuid(),
});

const buildUserWhere = (input: z.infer<typeof listUsersInput>): Prisma.UserWhereInput => {
  const filters: Prisma.UserWhereInput = { deletedAt: null };
  if (input.role) {
    filters.role = input.role;
  }
  if (input.status) {
    filters.status = input.status;
  }
  if (input.query) {
    const search = input.query.trim();
    filters.OR = [
      { email: { contains: search, mode: "insensitive" } },
      { handle: { contains: search, mode: "insensitive" } },
      { name: { contains: search, mode: "insensitive" } },
      { id: search },
    ];
  }
  return filters;
};

export const adminUsersRouter = router({
  list: adminProcedure.input(listUsersInput).query(async ({ input }) => {
    const limit = input.limit;
    const where = buildUserWhere(input);
  const orderBy: Prisma.UserOrderByWithRelationInput[] =
    input.sort === "activity"
      ? [
          { lastLoginAt: "desc" as Prisma.SortOrder },
          { createdAt: "desc" as Prisma.SortOrder },
        ]
      : [
          { createdAt: "desc" as Prisma.SortOrder },
          { id: "desc" as Prisma.SortOrder },
        ];

    const users = await prisma.user.findMany({
      where,
      orderBy,
      cursor: input.cursor ? { id: input.cursor } : undefined,
      skip: input.cursor ? 1 : 0,
      take: limit + 1,
      select: {
        id: true,
        email: true,
        handle: true,
        name: true,
        role: true,
        status: true,
        country: true,
        lastLoginAt: true,
        createdAt: true,
        bannedAt: true,
        stats: { select: { totalSolved: true } },
        _count: { select: { submissions: true } },
      },
    });

    let nextCursor: string | null = null;
    if (users.length > limit) {
      const next = users.pop();
      nextCursor = next?.id ?? null;
    }

    return {
      items: users.map((user) => ({
        ...user,
        solved: user.stats?.totalSolved ?? 0,
        submissionCount: user._count.submissions,
      })),
      nextCursor,
    };
  }),

  detail: adminProcedure.input(simpleUserId).query(async ({ input }) => {
    const user = await prisma.user.findUnique({
      where: { id: input.userId },
      select: {
        id: true,
        email: true,
        handle: true,
        name: true,
        role: true,
        status: true,
        country: true,
        timezone: true,
        bio: true,
        lastLoginAt: true,
        createdAt: true,
        bannedAt: true,
        socialGithub: true,
        socialLinkedin: true,
        socialTwitter: true,
        socialWebsite: true,
        stats: true,
        twoFactorEnabled: true,
        sessions: {
          orderBy: { lastUsedAt: "desc" },
          take: 10,
          select: {
            id: true,
            ipAddress: true,
            userAgent: true,
            lastUsedAt: true,
            createdAt: true,
            impersonatorId: true,
          },
        },
        submissions: {
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            id: true,
            verdictCode: true,
            status: true,
            createdAt: true,
            problem: {
              select: {
                slug: true,
                currentVersion: { select: { title: true } },
              },
            },
          },
        },
        _count: {
          select: {
            submissions: true,
            discussions: true,
          },
        },
      },
    });

    if (!user) {
      throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
    }

    const [auditLogs, submissionSummary] = await Promise.all([
      prisma.authAuditLog.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      prisma.submission.groupBy({
        by: ["status"],
        where: { userId: user.id },
        _count: true,
      }),
    ]);

    return {
      user,
      auditLogs,
      submissionSummary,
    };
  }),

  updateRole: adminProcedure.input(updateRoleInput).mutation(async ({ ctx, input }) => {
    const target = await prisma.user.findUnique({
      where: { id: input.userId },
      select: { id: true, role: true },
    });
    if (!target) {
      throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
    }
    if (target.role === input.role) {
      return { updated: false };
    }
    await prisma.user.update({
      where: { id: target.id },
      data: { role: input.role },
    });
    await createAuditLog({
      userId: target.id,
      action: "USER_ROLE_CHANGED",
      metadata: {
        actorId: ctx.session?.impersonatorId ?? ctx.user?.id,
        previousRole: target.role,
        newRole: input.role,
      },
    });
    return { updated: true };
  }),

  updateStatus: adminProcedure.input(updateStatusInput).mutation(async ({ ctx, input }) => {
    const target = await prisma.user.findUnique({
      where: { id: input.userId },
      select: { id: true, status: true },
    });
    if (!target) {
      throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
    }
    if (target.status === input.status) {
      return { updated: false };
    }
    await prisma.user.update({
      where: { id: target.id },
      data: {
        status: input.status,
        bannedAt: input.status === "ACTIVE" ? null : new Date(),
      },
    });
    if (input.status !== "ACTIVE") {
      await deleteAllUserSessions(target.id);
    }
    await createAuditLog({
      userId: target.id,
      action: "USER_STATUS_CHANGED",
      metadata: {
        actorId: ctx.session?.impersonatorId ?? ctx.user?.id,
        previousStatus: target.status,
        newStatus: input.status,
        reason: input.reason,
      },
    });
    return { updated: true };
  }),

  resetTwoFactor: adminProcedure.input(simpleUserId).mutation(async ({ ctx, input }) => {
    await prisma.user.update({
      where: { id: input.userId },
      data: { twoFactorEnabled: false },
    });
    await prisma.twoFactorSecret
      .delete({
        where: { userId: input.userId },
      })
      .catch(() => {});
    await prisma.twoFactorRecoveryCode.deleteMany({
      where: { userId: input.userId },
    });
    await createAuditLog({
      userId: input.userId,
      action: "TWO_FACTOR_DISABLED",
      metadata: {
        actorId: ctx.session?.impersonatorId ?? ctx.user?.id,
        reason: "Admin reset",
      },
    });
    return { ok: true };
  }),

  revokeSessions: adminProcedure.input(simpleUserId).mutation(async ({ ctx, input }) => {
    await deleteAllUserSessions(input.userId);
    await createAuditLog({
      userId: input.userId,
      action: "SESSION_REVOKED",
      metadata: {
        actorId: ctx.session?.impersonatorId ?? ctx.user?.id,
      },
    });
    return { ok: true };
  }),

  purge: adminProcedure.input(simpleUserId).mutation(async ({ ctx, input }) => {
    await prisma.$transaction([
      prisma.authAuditLog.updateMany({
        where: { userId: input.userId },
        data: { userId: null },
      }),
      prisma.user.delete({ where: { id: input.userId } }),
    ]);
    await createAuditLog({
      userId: input.userId,
      action: "USER_PURGED",
      metadata: {
        actorId: ctx.session?.impersonatorId ?? ctx.user?.id,
      },
    });
    return { ok: true };
  }),
});
