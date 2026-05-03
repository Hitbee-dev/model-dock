export type RateLimitDecision = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
};

export type RateLimiter = {
  allow(key: string, options: { limit: number; windowSeconds: number }): RateLimitDecision;
};

type Bucket = {
  count: number;
  resetAt: number;
};

export function createMemoryRateLimiter(now = () => Date.now()): RateLimiter {
  const buckets = new Map<string, Bucket>();

  return {
    allow(key, options) {
      const current = now();
      const existing = buckets.get(key);
      const bucket =
        existing && existing.resetAt > current
          ? existing
          : { count: 0, resetAt: current + options.windowSeconds * 1000 };

      bucket.count += 1;
      buckets.set(key, bucket);

      return {
        allowed: bucket.count <= options.limit,
        remaining: Math.max(0, options.limit - bucket.count),
        resetAt: bucket.resetAt
      };
    }
  };
}

