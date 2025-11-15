import { initTRPC, TRPCError } from "@trpc/server";
import type { TRPCContext } from "@/lib/trpc/context";
import { transformer } from "@/lib/trpc/transformer";
import type { UserRole } from "@prisma/client";

const t = initTRPC.context<TRPCContext>().create({
  transformer,
});

export const router = t.router;
export const mergeRouters = t.mergeRouters;
export const publicProcedure = t.procedure;
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

export const protectedProcedure = t.procedure.use(isAuthed);
export const adminProcedure = t.procedure.use(hasRole("ADMIN"));
export const curatorProcedure = t.procedure.use(hasRole("PROBLEM_CURATOR"));
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

export const staffProcedure = t.procedure.use(isStaff);
