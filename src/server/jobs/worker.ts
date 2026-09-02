import "dotenv/config";
import { db } from "@/db";
import { matches } from "@/db/schema";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { sportsProvider } from "@/server/providers";
import { callProvider, syncMatches } from "@/server/providers/resilience";
import { leaguesRepo } from "@/server/repositories/leagues.repo";
import { favoritesRepo, notificationsRepo } from "@/server/repositories/engagement.repo";
import { invalidate } from "@/server/cache";
import { purgeExpiredSessions } from "@/server/auth/session";
import { startEngine, tick as engineTick } from "@/server/live/engine";
import { logger } from "@/server/logger";
import { registerJob, runJob, startQueueLoop } from "./queue";

const HOUR = 3_600_000;

registerJob("sync-matches", 10 * 60_000, async () => {
  const provider = sportsProvider();
  const leagues = await leaguesRepo.list();
  const from = new Date(Date.now() - 3 * 86400_000);
  const to = new Date(Date.now() + 8 * 86400_000);
  let synced = 0;
  for (const league of leagues) {
    const payloads = await callProvider(provider, `matches:${league.slug}`, () =>
      provider.getMatches(league.slug, from, to),
    );
    const res = await syncMatches(provider, payloads);
    synced += res.synced;
  }
  await invalidate("v1:schedule:");
  await invalidate("v1:results:");
  await invalidate("v1:live:");
  return { leagues: leagues.length, synced };
});

registerJob("sync-standings", 15 * 60_000, async () => {
  const provider = sportsProvider();
  const leagues = await leaguesRepo.list();
  let updated = 0;
  for (const league of leagues) {
    const leagueRow = await leaguesRepo.bySlug(league.slug);
    if (!leagueRow) continue;
    const season = await leaguesRepo.currentSeason(leagueRow.id);
    if (!season) continue;
    const standings = await callProvider(provider, `standings:${league.slug}`, () =>
      provider.getStandings(league.slug),
    );
    await leaguesRepo.snapshotPositions(season.id);
    const { standings: standingsTable, teams: teamsTable } = await import("@/db/schema");
    const { inArray } = await import("drizzle-orm");
    const teamRows = await db
      .select({ id: teamsTable.id, ext: teamsTable.externalId })
      .from(teamsTable)
      .where(inArray(teamsTable.externalId, standings.map((s) => s.teamExternalId)));
    const teamMap = new Map(teamRows.map((r) => [r.ext, r.id]));
    for (const s of standings) {
      const teamId = teamMap.get(s.teamExternalId);
      if (!teamId) continue;
      await db
        .insert(standingsTable)
        .values({
          seasonId: season.id,
          teamId,
          position: s.position,
          played: s.played,
          won: s.won,
          drawn: s.drawn,
          lost: s.lost,
          goalsFor: s.goalsFor,
          goalsAgainst: s.goalsAgainst,
          points: s.points,
          form: s.form,
        })
        .onConflictDoUpdate({
          target: [standingsTable.seasonId, standingsTable.teamId],
          set: {
            position: s.position,
            played: s.played,
            won: s.won,
            drawn: s.drawn,
            lost: s.lost,
            goalsFor: s.goalsFor,
            goalsAgainst: s.goalsAgainst,
            points: s.points,
            form: s.form,
          },
        });
      updated++;
    }
  }
  await invalidate("v1:standings:");
  return { updated };
});

registerJob("notify-upcoming", 60_000, async () => {
  // matches starting in [25, 35] min → notify users who favorite either team
  const now = Date.now();
  const from = new Date(now + 25 * 60_000);
  const to = new Date(now + 35 * 60_000);
  const upcoming = await db
    .select({
      id: matches.id,
      startTime: matches.startTime,
      homeTeamId: matches.homeTeamId,
      awayTeamId: matches.awayTeamId,
    })
    .from(matches)
    .where(and(eq(matches.status, "scheduled"), gte(matches.startTime, from), lte(matches.startTime, to)))
    .limit(50);

  let sent = 0;
  for (const m of upcoming) {
    // dedupe: skip if we already notified for this match (link_url match)
    const existing = await db.execute(sql`
      SELECT 1 FROM notifications
      WHERE type = 'match_starting' AND link_url = ${`/matches/${m.id}`} LIMIT 1
    `);
    if ((existing as unknown as unknown[]).length > 0) continue;

    const homeFans = await favoritesRepo.usersForTeam(m.homeTeamId);
    const awayFans = await favoritesRepo.usersForTeam(m.awayTeamId);
    const fanIds = [...new Set([...homeFans, ...awayFans])];
    if (fanIds.length === 0) continue;

    const { teams: teamsTable } = await import("@/db/schema");
    const { inArray } = await import("drizzle-orm");
    const teamRows = await db
      .select({ id: teamsTable.id, name: teamsTable.name })
      .from(teamsTable)
      .where(inArray(teamsTable.id, [m.homeTeamId, m.awayTeamId]));
    const homeName = teamRows.find((t) => t.id === m.homeTeamId)?.name ?? "Home";
    const awayName = teamRows.find((t) => t.id === m.awayTeamId)?.name ?? "Away";
    const mins = Math.max(1, Math.round((m.startTime.getTime() - now) / 60_000));

    await notificationsRepo.insertMany(
      fanIds.map((userId) => ({
        userId,
        type: "match_starting" as const,
        title: `${homeName} vs ${awayName} bắt đầu sau ${mins} phút`,
        body: "Trận đấu sắp diễn ra. Xem trực tiếp ngay!",
        linkUrl: `/matches/${m.id}`,
      })),
    );
    // push to live hub so online users see badge update instantly
    const { hub } = await import("@/server/live/hub");
    for (const uid of fanIds) {
      await hub.publish(`user:${uid}`, "notification", { title: `${homeName} vs ${awayName}`, matchId: m.id });
    }
    sent += fanIds.length;
  }
  return { sent };
});

registerJob("purge-sessions", 6 * HOUR, async () => {
  const purged = await purgeExpiredSessions();
  return { purged };
});

registerJob("purge-notifications", 24 * HOUR, async () => {
  const purged = await notificationsRepo.purgeOlderThan(30);
  return { purged };
});

registerJob("cleanup-jobs", 12 * HOUR, async () => {
  // keep job_runs last 7 days
  const res = await db.execute(sql`DELETE FROM job_runs WHERE created_at < now() - interval '7 days'`);
  return { purged: (res as unknown as unknown[]).length };
});

/**
 * Worker entry — owns engine ticks + scheduled jobs.
 * Graceful shutdown: flush intervals on SIGTERM/SIGINT.
 */
export async function main() {
  logger.info("worker starting", { pid: process.pid });
  startEngine();

  // run all jobs once at boot (resilient: failures logged, not fatal)
  const jobs: Parameters<typeof runJob>[0][] = [
    "sync-matches",
    "sync-standings",
    "notify-upcoming",
    "purge-sessions",
    "purge-notifications",
    "cleanup-jobs",
  ];
  await Promise.all(jobs.map((j) => runJob(j).catch(() => {})));

  const stopLoop = startQueueLoop((name) => {
    void runJob(name).catch(() => {});
  });

  // engine tick loop every 5s (worker owns it when deployed with Redis)
  const engineTimer = setInterval(() => {
    void engineTick().catch(() => {});
  }, 5_000);
  if (typeof engineTimer.unref === "function") engineTimer.unref();

  const shutdown = (signal: string) => {
    logger.info("worker shutting down", { signal });
    stopLoop();
    clearInterval(engineTimer);
    process.exit(0);
  };
    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
}

// worker entry — run when executed as script (not imported)
if (process.argv[1]?.includes("worker")) {
  void main();
}
