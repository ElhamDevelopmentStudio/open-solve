import { LRUCache } from "lru-cache";

type RateLimitOptions = {
  identifier: string;
  windowInSeconds: number;
  maxRequests: number;
};

type RateLimitResult = {
  success: boolean;
  remaining: number;
  reset: number;
};

const buckets = new LRUCache<string, { remaining: number; reset: number }>({
  max: 10_000,
});

export function rateLimit({
  identifier,
  windowInSeconds,
  maxRequests,
}: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const windowMs = windowInSeconds * 1000;

  const bucket = buckets.get(identifier);

  if (!bucket || bucket.reset <= now) {
    const reset = now + windowMs;
    buckets.set(
      identifier,
      {
        remaining: Math.max(0, maxRequests - 1),
        reset,
      },
      { ttl: windowMs },
    );

    return {
      success: true,
      remaining: Math.max(0, maxRequests - 1),
      reset,
    };
  }

  if (bucket.remaining <= 0) {
    return {
      success: false,
      remaining: 0,
      reset: bucket.reset,
    };
  }

  const updated = {
    remaining: bucket.remaining - 1,
    reset: bucket.reset,
  };

  buckets.set(identifier, updated, { ttl: bucket.reset - now });

  return {
    success: true,
    remaining: updated.remaining,
    reset: bucket.reset,
  };
}
