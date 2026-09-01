import { cache } from "@/server/cache";

/**
 * Sliding-window rate limiter.
 * Redis mode works across instances; memory mode per-instance (docs note the tradeoff).
 */
export async function rateLimit(
  bucket: string,
  identifier: string,
  limit: number,
  windowSec: number,
): Promise<{ allowed: boolean; remaining: number; resetSec: number }> {
  const key = `rl:${bucket}:${identifier}`;
  const driver = cache();
  const now = Date.now();
  const windowMs = windowSec * 1000;

  let hits: number[] = [];
  const raw = await driver.get(key);
  if (raw) hits = (JSON.parse(raw) as number[]).filter((t) => t > now - windowMs);

  if (hits.length >= limit) {
    const oldest = Math.min(...hits);
    return { allowed: false, remaining: 0, resetSec: Math.ceil((oldest + windowMs - now) / 1000) };
  }

  hits.push(now);
  // keep TTL aligned with window so stale buckets disappear
  await driver.set(key, JSON.stringify(hits), windowSec);
  return { allowed: true, remaining: limit - hits.length, resetSec: windowSec };
}
