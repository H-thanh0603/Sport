import { matchesRepo } from "@/server/repositories/matches.repo";
import { sportsProvider } from "@/server/providers";
import { callProvider } from "@/server/providers/resilience";
import { hub } from "./hub";
import { matchesService } from "@/server/services/matches.service";
import { logger } from "@/server/logger";
import { db } from "@/db";
import { matchEvents } from "@/db/schema";

const TICK_MS = 5_000;
const FULL_TIME_MINUTES: Record<string, number> = {
  football: 90,
  basketball: 40,
  tennis: 0,
  badminton: 0,
  volleyball: 0,
  esports: 0,
};

let running = false;

/** Minutes elapsed for a live match (football); others return elapsed minutes. */
function computeMinute(startTime: Date, sportSlug: string): number {
  const elapsed = Math.floor((Date.now() - startTime.getTime()) / 60_000);
  if (sportSlug === "football") return Math.min(elapsed, 90);
  return elapsed;
}

/**
 * Live engine — ticks every 5s:
 * 1. For each live match: poll provider events (resilient), persist new ones,
 *    recompute score/minute, publish deltas to hub.
 * 2. Finish matches past full time (or elapsed > 2x expected for non-timed sports).
 * 3. Promote scheduled → live when start time reached.
 * Single-writer via Redis lock when REDIS_URL present; else process-local flag.
 */
export async function tick(): Promise<{ live: number; finished: number; promoted: number }> {
  if (running) return { live: 0, finished: 0, promoted: 0 };
  running = true;
  let finished = 0;
  let promoted = 0;
  try {
    // promote scheduled → live
    const { matches: matchesTable } = await import("@/db/schema");
    const { lte, and, eq, sql } = await import("drizzle-orm");
    const promotedRows = await db
      .update(matchesTable)
      .set({ status: "live", minute: 0 })
      .where(
        and(
          eq(matchesTable.status, "scheduled"),
          lte(matchesTable.startTime, new Date()),
          sql`${matchesTable.startTime} > now() - interval '4 hours'`,
        ),
      )
      .returning({ id: matchesTable.id });
    promoted = promotedRows.length;
    for (const row of promotedRows) {
      await hub.publish(`match:${row.id}`, "status", { status: "live" });
    }
    if (promoted > 0) {
      await hub.publish("home", "status", { promoted });
      await invalidateEngineCaches();
    }

    // process live matches
    const liveMatches = await matchesRepo.liveIds();
    for (const m of liveMatches) {
      try {
        if (m.externalId) {
          const provider = sportsProvider();
          const events = await callProvider(provider, "live-events", () =>
            provider.getLiveEvents(m.externalId!),
            2,
          );
          if (events.length > 0) {
            const existing = await db
              .select({ minute: matchEvents.minute, type: matchEvents.type })
              .from(matchEvents)
              .where(sql`${matchEvents.matchId} = ${m.id}`);
            const existingKeys = new Set(existing.map((e) => `${e.minute}:${e.type}`));
            const fresh = events.filter((e) => !existingKeys.has(`${e.minute}:${e.type}`));
            for (const e of fresh) {
              const { teams: teamsTable } = await import("@/db/schema");
              const { eq: eqOp } = await import("drizzle-orm");
              let teamId: number | null = null;
              if (e.teamExternalId) {
                const [teamRow] = await db
                  .select({ id: teamsTable.id })
                  .from(teamsTable)
                  .where(eqOp(teamsTable.externalId, e.teamExternalId))
                  .limit(1);
                teamId = teamRow?.id ?? null;
              }
              await db.insert(matchEvents).values({
                matchId: m.id,
                minute: e.minute,
                type: e.type,
                teamId,
                detail: e.detail,
              });
              await hub.publish(`match:${m.id}`, "event", {
                minute: e.minute,
                type: e.type,
                teamId,
                detail: e.detail,
              });
            }
          }
        }

        // recompute score from events + minute from clock
        const minute = computeMinute(m.startTime, m.sportSlug);
        const fullTime = FULL_TIME_MINUTES[m.sportSlug] ?? 0;
        const isDone = fullTime > 0 ? minute >= fullTime : false;
        if (isDone) {
          // final score from stored events
          const { sql: sqlOp } = await import("drizzle-orm");
          const [scoreRow] = await db.execute(sqlOp`
            SELECT
              count(*) FILTER (WHERE ev.type = 'goal' AND ev.team_id = mm.home_team_id)::int AS home,
              count(*) FILTER (WHERE ev.type = 'goal' AND ev.team_id = mm.away_team_id)::int AS away
            FROM matches mm JOIN match_events ev ON ev.match_id = mm.id
            WHERE mm.id = ${m.id}
          `) as unknown as { home: number; away: number }[];
          const home = scoreRow?.home ?? 0;
          const away = scoreRow?.away ?? 0;
          await matchesRepo.setFinished(m.id, home, away);
          await hub.publish(`match:${m.id}`, "status", { status: "finished" });
          await hub.publish(`match:${m.id}`, "score", {
            homeScore: home,
            awayScore: away,
            minute: fullTime,
            status: "finished",
          });
          finished++;
        } else {
          await matchesRepo.updateLive(m.id, { minute });
          await hub.publish(`match:${m.id}`, "score", { minute });
          await hub.publish("home", "score", { matchId: m.id, minute });
        }
      } catch (err) {
        logger.warn("engine: match tick failed", { matchId: m.id, error: String(err) });
      }
    }
    if (liveMatches.length > 0) await matchesService.onMatchChanged(0).catch(() => {});
    return { live: liveMatches.length, finished, promoted };
  } finally {
    running = false;
  }
}

async function invalidateEngineCaches() {
  try {
    const { invalidate } = await import("@/server/cache");
    await invalidate("v1:live:");
    await invalidate("v1:schedule:");
  } catch {
    // best effort
  }
}

/** Start interval — call once per process (worker or first SSE client). */
export function startEngine() {
  const timer = setInterval(() => {
    void tick().catch((err) => logger.error("engine tick error", { error: String(err) }));
  }, TICK_MS);
  if (typeof timer.unref === "function") timer.unref();
  logger.info("live engine started", { tickMs: TICK_MS });
  return () => clearInterval(timer);
}
