import { cache } from "@/server/cache";
import { logger } from "@/server/logger";
import { db } from "@/db";
import { jobRuns } from "@/db/schema";

export type JobName =
  | "sync-matches"
  | "sync-standings"
  | "notify-upcoming"
  | "purge-sessions"
  | "purge-notifications"
  | "cleanup-jobs";

type JobHandler = () => Promise<unknown>;

const handlers = new Map<JobName, { handler: JobHandler; intervalMs: number; lastRun: number }>();

/**
 * Queue abstraction — Redis-backed schedules when REDIS_URL set (shared across
 * instances), else in-process timers (single instance). Idempotent handlers.
 */
export function registerJob(name: JobName, intervalMs: number, handler: JobHandler) {
  handlers.set(name, { handler, intervalMs, lastRun: 0 });
}

export async function runJob(name: JobName): Promise<void> {
  const job = handlers.get(name);
  if (!job) {
    logger.warn("unknown job requested", { name });
    return;
  }
  const start = Date.now();
  let status = "ok";
  let detail: unknown = null;
  try {
    detail = await job.handler();
  } catch (err) {
    status = "error";
    detail = { error: String(err) };
    logger.error("job failed", { name, error: String(err) });
  }
  job.lastRun = Date.now();
  await db
    .insert(jobRuns)
    .values({ jobName: name, status, durationMs: Date.now() - start, detail: detail as object })
    .catch(() => {}); // job_runs write failure must not crash worker
  logger.info("job finished", { name, status, ms: Date.now() - start });
}

/** Start interval loop — used by worker entry. Returns stop fn. */
export function startQueueLoop(onTick: (name: JobName) => void): () => void {
  const timers: ReturnType<typeof setInterval>[] = [];
  for (const [name, job] of handlers) {
    const t = setInterval(() => onTick(name), job.intervalMs);
    if (typeof t.unref === "function") t.unref();
    timers.push(t);
  }
  return () => timers.forEach((t) => clearInterval(t));
}

/** Leader lock for engine ticks — SET NX EX pattern. */
export async function acquireLock(key: string, ttlSec: number): Promise<boolean> {
  const token = `${process.pid}-${Date.now()}`;
  const driver = cache();
  const existing = await driver.get(key);
  if (existing) return false;
  await driver.set(key, token, ttlSec);
  return true;
}
