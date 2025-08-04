import { createCallerContext } from "@/lib/trpc/context";
import { appRouter } from "@/lib/trpc/router";

export async function createTRPCCaller() {
  const ctx = await createCallerContext();
  return appRouter.createCaller(ctx);
}
