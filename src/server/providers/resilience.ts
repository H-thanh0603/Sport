import { db } from "@/db";
import { leagues, matches, teams } from "@/db/schema";
import { inArray, sql } from "drizzle-orm";
import type { SportsDataProvider } from "./provider";
import type { MatchSyncPayload } from "./types";
import { logger } from "@/server/logger";

/**
 * Circuit breaker per provider — resets after cooldown.
 * States: closed (ok) → open (failing fast) → half-open (probe).
 */
class CircuitBreaker {
  private failures = new Map<string, { count: number; openedAt: number }>();
  private readonly threshold = 3;
  private readonly cooldownMs = 60_000;

  isOpen(key: string): boolean {
    const s = this.failures.get(key);
    if (!s) return false;
    if (Date.now() - s.openedAt > this.cooldownMs) {
      this.failures.delete(key);
      return false;
    }
    return s.count >= this.threshold;
  }

  recordSuccess(key: string): void {
    this.failures.delete(key);
  }

  recordFailure(key: string): void {
    const s = this.failures.get(key);
    if (s) {
      s.count++;
      if (s.count >= this.threshold) s.openedAt = Date.now();
    } else {
      this.failures.set(key, { count: 1, openedAt: 0 });
    }
  }
}

const breaker = new CircuitBreaker();

/** Call provider with retry (exp backoff) + circuit breaker. */
export async function callProvider<T>(
  provider: SportsDataProvider,
  op: string,
  fn: () => Promise<T>,
  attempts = 3,
): Promise<T> {
  const key = `${provider.name}:${op}`;
  if (breaker.isOpen(key)) {
    throw new Error(`circuit open: ${key}`);
  }
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fn();
      breaker.recordSuccess(key);
      return res;
    } catch (err) {
      lastErr = err;
      const delay = 2 ** i * 200 + Math.random() * 100;
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  breaker.recordFailure(key);
  logger.warn("provider call failed", { op, error: String(lastErr) });
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

/**
 * Sync a batch of matches into DB (upsert on external+provider — dedupe guarantee).
 * Conflict strategy: provider wins while match not finished; DB wins after finish
 * (protects manual corrections from being overwritten by stale provider data).
 */
export async function syncMatches(provider: SportsDataProvider, payloads: MatchSyncPayload[]) {
  if (payloads.length === 0) return { synced: 0 };
  const leagueExtIds = [...new Set(payloads.map((p) => p.leagueExternalId))];
  const leagueRows = await db
    .select({ id: leagues.id, ext: leagues.externalId, sportId: leagues.sportId })
    .from(leagues)
    .where(inArray(leagues.externalId, leagueExtIds));
  const leagueMap = new Map(leagueRows.map((r) => [r.ext, r]));

  const teamExtIds = [
    ...new Set(payloads.flatMap((p) => [p.homeTeamExternalId, p.awayTeamExternalId])),
  ];
  const teamRows = await db
    .select({ id: teams.id, ext: teams.externalId })
    .from(teams)
    .where(inArray(teams.externalId, teamExtIds));
  const teamMap = new Map(teamRows.map((r) => [r.ext, r.id]));

  let synced = 0;
  for (const p of payloads) {
    const league = leagueMap.get(p.leagueExternalId);
    const homeTeamId = teamMap.get(p.homeTeamExternalId);
    const awayTeamId = teamMap.get(p.awayTeamExternalId);
    if (!league || !homeTeamId || !awayTeamId) {
      logger.warn("sync: skipping match with unknown refs", { externalId: p.externalId });
      continue;
    }
    const { id: leagueId, sportId } = league;
    const row = {
      sportId,
      leagueId,
      homeTeamId,
      awayTeamId,
      startTime: p.startTime,
      status: p.status,
      homeScore: p.homeScore,
      awayScore: p.awayScore,
      minute: p.minute,
      winnerTeamId:
        p.status === "finished" && p.homeScore !== null && p.awayScore !== null
          ? p.homeScore > p.awayScore
            ? homeTeamId
            : p.awayScore > p.homeScore
              ? awayTeamId
              : null
          : null,
      postponedReason: p.postponedReason,
      lastSyncedAt: new Date(),
    };
    await db
      .insert(matches)
      .values({ ...row, externalId: p.externalId, provider: provider.name })
      .onConflictDoUpdate({
        target: [matches.externalId, matches.provider],
        set: {
          // finished matches in DB are authoritative (manual corrections win)
          status: sql`CASE WHEN ${matches.status} = 'finished' THEN ${matches.status} ELSE excluded.status END`,
          homeScore: sql`CASE WHEN ${matches.status} = 'finished' THEN ${matches.homeScore} ELSE excluded.home_score END`,
          awayScore: sql`CASE WHEN ${matches.status} = 'finished' THEN ${matches.awayScore} ELSE excluded.away_score END`,
          minute: sql`CASE WHEN ${matches.status} = 'finished' THEN ${matches.minute} ELSE excluded.minute END`,
          startTime: sql`excluded.start_time`,
          postponedReason: sql`excluded.postponed_reason`,
          lastSyncedAt: sql`excluded.last_synced_at`,
        },
      });
    synced++;
  }
  return { synced };
}
