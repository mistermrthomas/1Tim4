/**
 * In-flight duplicate submission guard (per user + requestId).
 */

const inflight = new Map<string, number>();
const DEFAULT_TTL_MS = 90_000;

export function beginIdempotentRequest(
  userId: string,
  requestId: string | undefined,
  now = Date.now(),
  ttlMs = DEFAULT_TTL_MS,
): { ok: true } | { ok: false } {
  // Drop expired
  for (const [key, expires] of inflight) {
    if (expires <= now) inflight.delete(key);
  }
  if (!requestId) return { ok: true };
  const key = `${userId}:${requestId}`;
  const existing = inflight.get(key);
  if (existing && existing > now) return { ok: false };
  inflight.set(key, now + ttlMs);
  return { ok: true };
}

export function endIdempotentRequest(userId: string, requestId: string | undefined): void {
  if (!requestId) return;
  inflight.delete(`${userId}:${requestId}`);
}

export function __resetIdempotencyForTests(): void {
  inflight.clear();
}
