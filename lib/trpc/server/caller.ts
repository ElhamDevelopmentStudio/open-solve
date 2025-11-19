import { createCallerContext, createPublicCallerContext } from "@/lib/trpc/context";
import { appRouter } from "@/lib/trpc/router";

export async function createTRPCCaller() {
  const ctx = await createCallerContext();
  return appRouter.createCaller(ctx);
}

export async function createPublicTRPCCaller() {
  const ctx = await createPublicCallerContext();
  return appRouter.createCaller(ctx);
}
