import type Redis from "ioredis";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Redis-based rate limiter using INCR + EXPIRE (sliding window per interval).
 *
 * @param redisClient - ioredis client instance
 * @param key         - Unique key for this rate-limit bucket (e.g. "ratelimit:userId:action")
 * @param limit       - Maximum number of requests allowed within the window
 * @param windowSecs  - Window duration in seconds
 */
export async function rateLimit(
  redisClient: Redis,
  key: string,
  limit: number,
  windowSecs: number
): Promise<RateLimitResult> {
  const count = await redisClient.incr(key);

  // Only set expiry on the first request in this window
  if (count === 1) {
    await redisClient.expire(key, windowSecs);
  }

  const resetAt = Math.floor(Date.now() / 1000) + windowSecs;

  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    resetAt,
  };
}
