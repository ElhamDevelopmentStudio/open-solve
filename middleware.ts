import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { rateLimit } from "@/lib/rate-limit";

const RATE_LIMITED_PATH = /^\/api\//;

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!RATE_LIMITED_PATH.test(pathname)) {
    return NextResponse.next();
  }

  const identifier = getIdentifier(request);
  const result = rateLimit({
    identifier,
    windowInSeconds: env.RATE_LIMIT_WINDOW_SECONDS,
    maxRequests: env.RATE_LIMIT_MAX_REQUESTS,
  });

  if (!result.success) {
    logger.warn(
      {
        identifier,
        path: pathname,
        retryAt: result.reset,
      },
      "rate limit exceeded",
    );

    const retryAfter = Math.max(1, Math.ceil((result.reset - Date.now()) / 1000));
    const response = NextResponse.json(
      {
        error: "Too many requests",
      },
      { status: 429 },
    );

    attachRateLimitHeaders(response, {
      remaining: 0,
      reset: result.reset,
    });

    response.headers.set("Retry-After", retryAfter.toString());

    return response;
  }

  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-request-id", requestId);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  attachRateLimitHeaders(response, result);
  response.headers.set("x-request-id", requestId);

  logger.debug(
    {
      identifier,
      path: pathname,
      remaining: result.remaining,
      reset: result.reset,
      requestId,
    },
    "rate limit check passed",
  );

  return response;
}

export const config = {
  matcher: ["/api/:path*"],
};

function getIdentifier(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const [first] = forwardedFor.split(",");
    return first.trim();
  }

  const realIp =
    request.headers.get("x-real-ip") ?? request.headers.get("x-vercel-ip");
  if (realIp) {
    return realIp;
  }

  return request.nextUrl.hostname ?? "anonymous";
}

function attachRateLimitHeaders(
  response: NextResponse,
  result: Pick<ReturnType<typeof rateLimit>, "remaining" | "reset">,
) {
  response.headers.set("X-RateLimit-Limit", env.RATE_LIMIT_MAX_REQUESTS.toString());
  response.headers.set("X-RateLimit-Remaining", Math.max(result.remaining, 0).toString());
  response.headers.set("X-RateLimit-Reset", Math.floor(result.reset / 1000).toString());
}
