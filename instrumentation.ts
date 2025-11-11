import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import * as Sentry from "@sentry/nextjs";

const sentryEnabled = Boolean(env.SENTRY_DSN);

const sharedOptions = sentryEnabled
  ? {
      dsn: env.SENTRY_DSN,
      enabled: true,
      environment: env.SENTRY_ENVIRONMENT,
      tracesSampleRate: 0.2,
      profilesSampleRate: 0.1,
    }
  : {
      enabled: false,
    };

declare global {
  var __APP_PROCESS_HANDLERS_INITIALIZED__: boolean | undefined;
}

export async function register() {
  const runtime = process.env.NEXT_RUNTIME;

  if (runtime === "edge") {
    if (sentryEnabled) {
      Sentry.init({
        ...sharedOptions,
        profilesSampleRate: 0,
      });
    }
    return;
  }

  if (runtime === "nodejs") {
    if (sentryEnabled) {
      Sentry.init(sharedOptions);
    }

    const processRef = globalThis?.process as NodeJS.Process | undefined;
    if (!processRef?.on || globalThis.__APP_PROCESS_HANDLERS_INITIALIZED__) {
      return;
    }

    const ignoredMessages = new Set([
      "the worker has exited",
      "Cannot find module '/ROOT/node_modules/thread-stream/lib/worker.js'",
      "the worker thread exited",
    ]);

    processRef.on("unhandledRejection", (reason) => {
      if (reason instanceof Error && ignoredMessages.has(reason.message)) {
        return;
      }

      logger.error({ reason }, "unhandled rejection");
    });

    processRef.on("uncaughtException", (error) => {
      if (error instanceof Error && ignoredMessages.has(error.message)) {
        return;
      }

      logger.error({ err: error }, "uncaught exception");
    });

    globalThis.__APP_PROCESS_HANDLERS_INITIALIZED__ = true;
  }
}

export function onRequestError(
  error: unknown,
  request: Readonly<{
    path: string;
    method: string;
    headers: NodeJS.Dict<string | string[]>;
  }>,
  context: Readonly<{
    routerKind: "Pages Router" | "App Router";
    routePath: string;
    routeType: "render" | "route" | "action" | "middleware";
    renderSource?:
      | "react-server-components"
      | "react-server-components-payload"
      | "server-rendering";
    revalidateReason: "on-demand" | "stale" | undefined;
  }>,
) {
  if (sentryEnabled && typeof Sentry.captureRequestError === "function") {
    Sentry.captureRequestError(error, request, context);
    return;
  }

  if (error instanceof Error) {
    logger.error(
      { err: error, path: request.path, method: request.method, context },
      "request error",
    );
  } else {
    logger.error({ error, path: request.path, method: request.method, context }, "request error");
  }
}
