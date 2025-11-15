import { prisma } from "@/lib/prisma";
import { adminProcedure, router } from "@/lib/trpc/trpc";
import { createSession, restoreSession } from "@/lib/auth/session";
import { createAuditLog } from "@/lib/auth/audit";
import { extractClientMeta } from "@/lib/utils/request";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

export const adminImpersonationRouter = router({
  start: adminProcedure
    .input(
      z.object({
        userId: z.string().cuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session || !ctx.user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      if (ctx.session.impersonatorId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Already impersonating another user",
        });
      }
      if (ctx.user.id === input.userId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You are already operating as this user",
        });
      }

      const target = await prisma.user.findUnique({
        where: { id: input.userId },
        select: { id: true, handle: true, role: true, status: true },
      });
      if (!target) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }
      if (target.status === "BANNED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot impersonate a banned user",
        });
      }

      const meta = extractClientMeta(ctx.headers);
      await createSession(target.id, meta.userAgent, meta.ipAddress, {
        impersonatorId: ctx.session.userId,
        impersonatorSessionId: ctx.session.id,
      });
      await Promise.all([
        createAuditLog({
          userId: ctx.session.userId,
          action: "IMPERSONATION_STARTED",
          metadata: {
            targetUserId: target.id,
            targetHandle: target.handle,
          },
        }),
        createAuditLog({
          userId: target.id,
          action: "IMPERSONATION_STARTED",
          metadata: {
            actorId: ctx.session.userId,
          },
        }),
      ]);

      return {
        target,
      };
    }),

  stop: adminProcedure.mutation(async ({ ctx }) => {
    if (!ctx.session) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    if (!ctx.session.impersonatorSessionId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "You are not impersonating anyone",
      });
    }

    const originalSessionId = ctx.session.impersonatorSessionId;
    const impersonatedSessionId = ctx.session.id;
    const actorId = ctx.session.impersonatorId ?? ctx.user?.id ?? null;

    const restored = await restoreSession(originalSessionId);
    if (!restored) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Original session was not found",
      });
    }

    await prisma.session
      .delete({
        where: { id: impersonatedSessionId },
      })
      .catch(() => {});

    await Promise.all([
      createAuditLog({
        userId: actorId ?? restored.user.id,
        action: "IMPERSONATION_ENDED",
        metadata: {
          targetUserId: ctx.user?.id,
        },
      }),
      ctx.user
        ? createAuditLog({
            userId: ctx.user.id,
            action: "IMPERSONATION_ENDED",
            metadata: { actorId },
          })
        : Promise.resolve(),
    ]);

    return { ok: true };
  }),
});
