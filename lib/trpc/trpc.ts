import { initTRPC, TRPCError } from "@trpc/server";
import type { TRPCContext } from "@/lib/trpc/context";
import { transformer } from "@/lib/trpc/transformer";
import type { UserRole } from "@prisma/client";
import { recordTrpcResult, startTrpcTimer } from "@/lib/observability/metrics";

const t = initTRPC.context<TRPCContext>().create({
  transformer,
});

const metricsMiddleware = t.middleware(async ({ path, type, next }) => {
  const procedure = path ?? "unknown";
  const method = type ?? "unknown";
  const stopTimer = startTrpcTimer({ procedure, method });
  try {
    const result = await next();
    recordTrpcResult({ procedure, method, status: "success" });
    return result;
  } catch (error) {
    const status = error instanceof TRPCError ? error.code : "failure";
    recordTrpcResult({ procedure, method, status });
    throw error;
  } finally {
    stopTimer();
  }
});

export const router = t.router;
export const mergeRouters = t.mergeRouters;
const baseProcedure = t.procedure.use(metricsMiddleware);

export const publicProcedure = baseProcedure;
export const createCallerFactory = t.createCallerFactory;

// Middleware to check if user is authenticated
const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.user || !ctx.session) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
      session: ctx.session,
    },
  });
});

// Middleware to check if user has a specific role
const hasRole = (role: UserRole) =>
  t.middleware(({ ctx, next }) => {
    if (!ctx.user || !ctx.session) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    const userIsAdmin = ctx.user.role === "ADMIN";
    const userHasRole = ctx.user.role === role;
    const impersonatingAdmin = role === "ADMIN" && Boolean(ctx.session.impersonatorId);

    if (!userHasRole && !userIsAdmin && !impersonatingAdmin) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
        session: ctx.session,
      },
    });
  });

export const protectedProcedure = baseProcedure.use(isAuthed);
export const adminProcedure = baseProcedure.use(hasRole("ADMIN"));
export const curatorProcedure = baseProcedure.use(hasRole("PROBLEM_CURATOR"));
const staffRoles: UserRole[] = ["PROBLEM_CURATOR", "MODERATOR", "ADMIN"];
const isStaff = t.middleware(({ ctx, next }) => {
  if (!ctx.user || !ctx.session) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  if (!staffRoles.includes(ctx.user.role)) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
      session: ctx.session,
    },
  });
});

export const staffProcedure = baseProcedure.use(isStaff);
