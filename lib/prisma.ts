import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { PrismaClient } from "@prisma/client";
import type { Prisma } from "@prisma/client";

const isProd = process.env.NODE_ENV === "production";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const logConfig: Prisma.LogDefinition[] = isProd
  ? [
      { emit: "event", level: "error" },
      { emit: "event", level: "warn" },
    ]
  : [
      { emit: "event", level: "query" },
      { emit: "event", level: "error" },
      { emit: "event", level: "warn" },
      { emit: "event", level: "info" },
    ];

const prismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: env.DATABASE_URL,
      },
    },
    log: logConfig,
  });

if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = prismaClient;
}

type PrismaWithEvents = PrismaClient & {
  $on(event: "query", callback: (event: Prisma.QueryEvent) => void): void;
  $on(event: "error", callback: (event: Prisma.LogEvent) => void): void;
  $on(event: "warn", callback: (event: Prisma.LogEvent) => void): void;
  $on(
    event: Prisma.LogLevel | "beforeExit",
    callback: (event: Prisma.LogEvent | Prisma.QueryEvent) => void,
  ): void;
};

const prismaWithEvents = prismaClient as PrismaWithEvents;

prismaWithEvents.$on("error", (event) => {
  logger.error(
    {
      target: event.target,
      message: event.message,
    },
    "prisma error",
  );
});

prismaWithEvents.$on("warn", (event) => {
  logger.warn(
    {
      target: event.target,
      message: event.message,
    },
    "prisma warning",
  );
});

if (!isProd) {
  prismaWithEvents.$on("query", (event) => {
    logger.debug(
      {
        query: event.query,
        params: event.params,
        durationMs: event.duration,
      },
      "prisma query",
    );
  });
}

export const prisma = prismaClient;
