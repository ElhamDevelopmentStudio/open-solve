import { LRUCache } from "lru-cache";

interface RateLimitConfig {
  interval: number; // in milliseconds
  maxRequests: number;
}

const limiters = new Map<string, LRUCache<string, { count: number; resetAt: number }>>();

function getLimiter(key: string, config: RateLimitConfig) {
  let limiter = limiters.get(key);
  if (!limiter) {
    limiter = new LRUCache<string, { count: number; resetAt: number }>({
      max: 10000,
      ttl: config.interval,
    });
    limiters.set(key, limiter);
  }
  return limiter;
}

export async function checkRateLimit(
  identifier: string,
  action: string,
  config: RateLimitConfig,
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const key = `${action}:${identifier}`;
  const limiter = getLimiter(action, config);
  const now = Date.now();

  const record = limiter.get(key);

  if (!record || record.resetAt <= now) {
    const resetAt = now + config.interval;
    limiter.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: config.maxRequests - 1, resetAt };
  }

  if (record.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: record.resetAt,
    };
  }

  record.count++;
  limiter.set(key, record);

  return {
    allowed: true,
    remaining: config.maxRequests - record.count,
    resetAt: record.resetAt,
  };
}

// Predefined rate limit configs
export const RATE_LIMITS = {
  SIGNUP: { interval: 60 * 60 * 1000, maxRequests: 3 }, // 3 per hour
  LOGIN: { interval: 15 * 60 * 1000, maxRequests: 5 }, // 5 per 15 minutes
  PASSWORD_RESET: { interval: 60 * 60 * 1000, maxRequests: 3 }, // 3 per hour
  EMAIL_VERIFY: { interval: 60 * 60 * 1000, maxRequests: 3 }, // 3 per hour
  MAGIC_LINK: { interval: 60 * 60 * 1000, maxRequests: 3 }, // 3 per hour
  TWO_FACTOR: { interval: 5 * 60 * 1000, maxRequests: 5 }, // 5 per 5 minutes
};

