import { Redis } from "ioredis";

/**
 * Cache abstraction: Redis when REDIS_URL set, else in-process LRU.
 * Multi-instance prod requires Redis; single-instance dev works without.
 */

export interface CacheDriver {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSec: number): Promise<void>;
  del(key: string): Promise<void>;
  delPrefix(prefix: string): Promise<void>;
  /** pub/sub — no-op in memory mode (single instance only) */
  publish(channel: string, message: string): Promise<void>;
  subscribe(channel: string, handler: (message: string) => void): Promise<() => void>;
}

/* ── memory LRU ─────────────────────────────────────────── */

class LruEntry {
  constructor(
    public value: string,
    public expiresAt: number,
  ) {}
}

class MemoryCache implements CacheDriver {
  private map = new Map<string, LruEntry>();
  private maxEntries = 10_000;
  private subs = new Map<string, Set<(m: string) => void>>();

  private evict() {
    if (this.map.size <= this.maxEntries) return;
    // Map preserves insertion order — drop oldest first
    const drop = this.map.size - this.maxEntries;
    let i = 0;
    for (const key of this.map.keys()) {
      this.map.delete(key);
      if (++i >= drop) break;
    }
  }

  async get(key: string): Promise<string | null> {
    const e = this.map.get(key);
    if (!e) return null;
    if (e.expiresAt < Date.now()) {
      this.map.delete(key);
      return null;
    }
    // refresh recency
    this.map.delete(key);
    this.map.set(key, e);
    return e.value;
  }

  async set(key: string, value: string, ttlSec: number): Promise<void> {
    this.map.set(key, new LruEntry(value, Date.now() + ttlSec * 1000));
    this.evict();
  }

  async del(key: string): Promise<void> {
    this.map.delete(key);
  }

  async delPrefix(prefix: string): Promise<void> {
    for (const key of this.map.keys()) {
      if (key.startsWith(prefix)) this.map.delete(key);
    }
  }

  async publish(channel: string, message: string): Promise<void> {
    const handlers = this.subs.get(channel);
    if (handlers) for (const h of handlers) h(message);
  }

  async subscribe(channel: string, handler: (m: string) => void): Promise<() => void> {
    let set = this.subs.get(channel);
    if (!set) {
      set = new Set();
      this.subs.set(channel, set);
    }
    set.add(handler);
    return () => {
      set?.delete(handler);
    };
  }
}

/* ── redis ──────────────────────────────────────────────── */

class RedisCache implements CacheDriver {
  private redis: Redis;
  private subRedis: Redis | null = null;

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL as string, {
      maxRetriesPerRequest: 2,
      lazyConnect: false,
      retryStrategy: (times) => Math.min(times * 200, 2000),
    });
    this.redis.on("error", (err) => {
      console.warn("[cache] redis error", { error: err.message });
    });
  }

  async get(key: string): Promise<string | null> {
    return this.redis.get(key);
  }

  async set(key: string, value: string, ttlSec: number): Promise<void> {
    await this.redis.set(key, value, "EX", ttlSec);
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async delPrefix(prefix: string): Promise<void> {
    // ponytail: SCAN-based batch delete; fine to 1M keys. Upgrade to Redis UNLINK pipeline if larger.
    let cursor = "0";
    do {
      const [next, keys] = await this.redis.scan(cursor, "MATCH", `${prefix}*`, "COUNT", 500);
      cursor = next;
      if (keys.length > 0) await this.redis.unlink(...keys);
    } while (cursor !== "0");
  }

  async publish(channel: string, message: string): Promise<void> {
    await this.redis.publish(channel, message);
  }

  async subscribe(channel: string, handler: (m: string) => void): Promise<() => void> {
    if (!this.subRedis) {
      this.subRedis = new Redis(process.env.REDIS_URL as string, { maxRetriesPerRequest: null });
      this.subRedis.on("error", (err) =>
        console.warn("[cache] redis sub error", { error: err.message }),
      );
    }
    await this.subRedis.subscribe(channel);
    const listener = (_ch: string, message: string) => handler(message);
    this.subRedis.on("message", listener);
    return async () => {
      this.subRedis?.unsubscribe(channel);
      this.subRedis?.off("message", listener);
    };
  }
}

/* ── factory + typed helpers ───────────────────────────── */

let cacheImpl: CacheDriver | null = null;

export function cache(): CacheDriver {
  if (!cacheImpl) cacheImpl = process.env.REDIS_URL ? new RedisCache() : new MemoryCache();
  return cacheImpl;
}

const memo = new Map<string, { at: number; ttl: number; value: unknown }>();
const IN_FLIGHT = new Map<string, Promise<unknown>>();

/** Cache-aside with stampede protection: single flight per key. */
export async function cached<T>(
  key: string,
  ttlSec: number,
  loader: () => Promise<T>,
): Promise<T> {
  // soft memo layer (per-process micro-cache)
  const m = memo.get(key);
  if (m && m.at + m.ttl * 1000 > Date.now()) return m.value as T;

  const raw = await cache().get(key);
  if (raw) return JSON.parse(raw) as T;

  let flight = IN_FLIGHT.get(key) as Promise<T> | undefined;
  if (!flight) {
    flight = loader().then(async (value) => {
      await cache().set(key, JSON.stringify(value), ttlSec);
      return value;
    });
    IN_FLIGHT.set(key, flight);
  }
  try {
    const value = await flight;
    memo.set(key, { at: Date.now(), ttl: Math.min(ttlSec, 5), value });
    return value;
  } finally {
    IN_FLIGHT.delete(key);
  }
}

export async function invalidate(prefix: string): Promise<void> {
  for (const key of memo.keys()) if (key.startsWith(prefix)) memo.delete(key);
  await cache().delPrefix(prefix);
}
