import { initTRPC } from "@trpc/server";
import type { TRPCContext } from "@/lib/trpc/context";
import { transformer } from "@/lib/trpc/transformer";

const t = initTRPC.context<TRPCContext>().create({
  transformer,
});

export const router = t.router;
export const mergeRouters = t.mergeRouters;
export const publicProcedure = t.procedure;
export const createCallerFactory = t.createCallerFactory;
