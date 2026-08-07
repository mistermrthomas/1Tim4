/**
 * Best-effort in-memory rate limiter for Vercel serverless functions.
 * Limits are per-instance; still useful against burst abuse.
 */

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

interface Bucket {
  timestamps: number[];
}

const buckets = new Map<string, Bucket>();

export function checkRateLimit(
  key: string,
  options: { limit: number; windowMs: number; now?: number } = {
    limit: 8,
    windowMs: 60_000,
  },
): RateLimitResult {
  const now = options.now ?? Date.now();
  const windowMs = options.windowMs;
  const limit = options.limit;
  const bucket = buckets.get(key) ?? { timestamps: [] };
  bucket.timestamps = bucket.timestamps.filter((t) => now - t < windowMs);

  if (bucket.timestamps.length >= limit) {
    const oldest = bucket.timestamps[0] ?? now;
    const retryAfterSeconds = Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000));
    buckets.set(key, bucket);
    return { allowed: false, remaining: 0, retryAfterSeconds };
  }

  bucket.timestamps.push(now);
  buckets.set(key, bucket);
  return {
    allowed: true,
    remaining: Math.max(0, limit - bucket.timestamps.length),
    retryAfterSeconds: 0,
  };
}

/** Test helper */
export function __resetRateLimitBucketsForTests(): void {
  buckets.clear();
}
