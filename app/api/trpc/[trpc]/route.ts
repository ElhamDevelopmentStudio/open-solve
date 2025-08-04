import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { logger } from "@/lib/logger";
import { createTRPCContext } from "@/lib/trpc/context";
import { appRouter } from "@/lib/trpc/router";

const endpoint = "/api/trpc";

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint,
    req,
    router: appRouter,
    createContext: () => createTRPCContext({ req }),
    onError({ error, path }) {
      if (process.env.NODE_ENV !== "production") {
        logger.error(
          {
            message: error.message,
            path,
          },
          "tRPC request failed",
        );
      }
    },
  });

export { handler as GET, handler as POST };
