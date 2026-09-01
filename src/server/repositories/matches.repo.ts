import { and, asc, between, desc, eq, gte, inArray, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { leagues, matches, sports, venues } from "@/db/schema";
import type { MatchListFilters, MatchStatus } from "@/server/services/types";

export type MatchWithTeamsRow = {
  id: number;
  startTime: Date;
  status: MatchStatus;
  minute: number | null;
  homeScore: number | null;
  awayScore: number | null;
  postponedReason: string | null;
  leagueSlug: string;
  leagueName: string;
  sportSlug: string;
  sportName: string;
  sportEmoji: string | null;
  homeTeamId: number;
  homeTeamSlug: string;
  homeTeamName: string;
  homeTeamShort: string | null;
  awayTeamId: number;
  awayTeamSlug: string;
  awayTeamName: string;
  awayTeamShort: string | null;
};

const matchSelect = {
  id: matches.id,
  startTime: matches.startTime,
  status: matches.status,
  minute: matches.minute,
  homeScore: matches.homeScore,
  awayScore: matches.awayScore,
  postponedReason: matches.postponedReason,
  leagueSlug: leagues.slug,
  leagueName: leagues.name,
  sportSlug: sports.slug,
  sportName: sports.name,
  sportEmoji: sports.emoji,
  homeTeamId: sql<number>`home_team.id`,
  homeTeamSlug: sql<string>`home_team.slug`,
  homeTeamName: sql<string>`home_team.name`,
  homeTeamShort: sql<string | null>`home_team.short_name`,
  awayTeamId: sql<number>`away_team.id`,
  awayTeamSlug: sql<string>`away_team.slug`,
  awayTeamName: sql<string>`away_team.name`,
  awayTeamShort: sql<string | null>`away_team.short_name`,
};

function baseQuery() {
  return db
    .select(matchSelect)
    .from(matches)
    .innerJoin(leagues, eq(leagues.id, matches.leagueId))
    .innerJoin(sports, eq(sports.id, matches.sportId))
    .innerJoin(sql`teams as home_team`, sql`home_team.id = ${matches.homeTeamId}`)
    .innerJoin(sql`teams as away_team`, sql`away_team.id = ${matches.awayTeamId}`);
}

export type MatchQueryResult = Awaited<ReturnType<typeof baseQuery>>[number];

/** Build WHERE from filters — shared by list + count. */
export function matchFilters(f: MatchListFilters): SQL | undefined {
  const conds: SQL[] = [];
  if (f.sport) conds.push(eq(sports.slug, f.sport));
  if (f.league) conds.push(eq(leagues.slug, f.league));
  if (typeof f.teamId === "number") {
    conds.push(or(eq(matches.homeTeamId, f.teamId), eq(matches.awayTeamId, f.teamId))!);
  }
  if (f.date) {
    // date is a local calendar day in UTC — matches the seed/data convention
    const from = new Date(`${f.date}T00:00:00.000Z`);
    const to = new Date(`${f.date}T23:59:59.999Z`);
    conds.push(between(matches.startTime, from, to));
  } else if (f.window === "today") {
    const now = new Date();
    const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const to = new Date(from.getTime() + 86400_000 - 1);
    conds.push(between(matches.startTime, from, to));
  } else if (f.window === "tomorrow") {
    const now = new Date();
    const from = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
    );
    const to = new Date(from.getTime() + 86400_000 - 1);
    conds.push(between(matches.startTime, from, to));
  } else if (f.window === "week") {
    const now = new Date();
    const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const to = new Date(from.getTime() + 7 * 86400_000 - 1);
    conds.push(between(matches.startTime, from, to));
  }
  if (f.status) {
    if (Array.isArray(f.status)) {
      if (f.status.length > 0) conds.push(inArray(matches.status, f.status as MatchStatus[]));
    } else {
      conds.push(eq(matches.status, f.status as MatchStatus));
    }
  }
  if (conds.length === 0) return undefined;
  return and(...conds);
}

export const matchesRepo = {
  async live(): Promise<MatchQueryResult[]> {
    return baseQuery()
      .where(inArray(matches.status, ["live", "halftime"]))
      .orderBy(asc(matches.startTime))
      .limit(100);
  },

  async upcoming(f: MatchListFilters, limit: number, offset: number) {
    const cond = and(
      eq(matches.status, "scheduled"),
      gte(matches.startTime, new Date()),
      matchFilters(f),
    );
    const items = await baseQuery()
      .where(cond)
      .orderBy(asc(matches.startTime))
      .limit(limit)
      .offset(offset);
    const countRows = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(matches)
      .innerJoin(leagues, eq(leagues.id, matches.leagueId))
      .innerJoin(sports, eq(sports.id, matches.sportId))
      .where(cond);
    const count = countRows[0]?.count ?? 0;
    return { items, total: count };
  },

  async results(f: MatchListFilters, limit: number, offset: number) {
    const cond = and(eq(matches.status, "finished"), matchFilters(f));
    const items = await baseQuery()
      .where(cond)
      .orderBy(desc(matches.startTime))
      .limit(limit)
      .offset(offset);
    const countRows = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(matches)
      .innerJoin(leagues, eq(leagues.id, matches.leagueId))
      .innerJoin(sports, eq(sports.id, matches.sportId))
      .where(cond);
    const count = countRows[0]?.count ?? 0;
    return { items, total: count };
  },

  async list(f: MatchListFilters, limit: number, offset: number) {
    const cond = matchFilters(f);
    const items = await baseQuery()
      .where(cond)
      .orderBy(asc(matches.startTime))
      .limit(limit)
      .offset(offset);
    const countRows = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(matches)
      .innerJoin(leagues, eq(leagues.id, matches.leagueId))
      .innerJoin(sports, eq(sports.id, matches.sportId))
      .where(cond);
    const count = countRows[0]?.count ?? 0;
    return { items, total: count };
  },

  async byId(id: number): Promise<MatchQueryResult | null> {
    const rows = await baseQuery().where(eq(matches.id, id)).limit(1);
    return rows[0] ?? null;
  },

  async h2h(teamA: number, teamB: number, limit = 5): Promise<MatchQueryResult[]> {
    const pair = or(
      and(eq(matches.homeTeamId, teamA), eq(matches.awayTeamId, teamB)),
      and(eq(matches.homeTeamId, teamB), eq(matches.awayTeamId, teamA)),
    );
    return baseQuery()
      .where(and(pair!, eq(matches.status, "finished")))
      .orderBy(desc(matches.startTime))
      .limit(limit);
  },

  async h2hSummary(teamA: number, teamB: number) {
    const [row] = await db
      .select({
        total: sql<number>`count(*)::int`,
        aWin: sql<number>`count(*) FILTER (WHERE (home_team.id = ${teamA} AND ${matches.homeScore} > ${matches.awayScore}) OR (away_team.id = ${teamA} AND ${matches.awayScore} > ${matches.homeScore}))::int`,
        bWin: sql<number>`count(*) FILTER (WHERE (home_team.id = ${teamB} AND ${matches.homeScore} > ${matches.awayScore}) OR (away_team.id = ${teamB} AND ${matches.awayScore} > ${matches.homeScore}))::int`,
        draw: sql<number>`count(*) FILTER (WHERE ${matches.homeScore} = ${matches.awayScore})::int`,
        goals: sql<number>`COALESCE(SUM(COALESCE(${matches.homeScore},0) + COALESCE(${matches.awayScore},0)), 0)::int`,
      })
      .from(matches)
      .innerJoin(sql`teams as home_team`, sql`home_team.id = ${matches.homeTeamId}`)
      .innerJoin(sql`teams as away_team`, sql`away_team.id = ${matches.awayTeamId}`)
      .where(
        and(
          eq(matches.status, "finished"),
          or(
            and(eq(matches.homeTeamId, teamA), eq(matches.awayTeamId, teamB)),
            and(eq(matches.homeTeamId, teamB), eq(matches.awayTeamId, teamA)),
          )!,
        ),
      );
    return row ?? { total: 0, aWin: 0, bWin: 0, draw: 0, goals: 0 };
  },

  async byTeamIds(teamIds: number[], f: { status?: MatchStatus | MatchStatus[] }, limit: number) {
    if (teamIds.length === 0) return [];
    const conds: SQL[] = [
      or(inArray(matches.homeTeamId, teamIds), inArray(matches.awayTeamId, teamIds))!,
    ];
    if (f.status) {
      if (Array.isArray(f.status)) {
        if (f.status.length) conds.push(inArray(matches.status, f.status));
      } else conds.push(eq(matches.status, f.status));
    }
    return baseQuery().where(and(...conds)).orderBy(desc(matches.startTime)).limit(limit);
  },

  async byLeagueIds(leagueIds: number[], limit: number) {
    if (leagueIds.length === 0) return [];
    return baseQuery()
      .where(and(inArray(matches.leagueId, leagueIds), eq(matches.status, "finished")))
      .orderBy(desc(matches.startTime))
      .limit(limit);
  },

  /** finished matches for a team pair list — used by team page fixtures */
  async recentByLeague(leagueId: number, limit: number, offset = 0) {
    return baseQuery()
      .where(eq(matches.leagueId, leagueId))
      .orderBy(desc(matches.startTime))
      .limit(limit)
      .offset(offset);
  },

  async updateLive(
    id: number,
    patch: { status?: MatchStatus; minute?: number | null; homeScore?: number; awayScore?: number },
  ) {
    const set: Record<string, unknown> = { lastSyncedAt: new Date() };
    if (patch.status !== undefined) set.status = patch.status;
    if (patch.minute !== undefined) set.minute = patch.minute;
    if (patch.homeScore !== undefined) set.homeScore = patch.homeScore;
    if (patch.awayScore !== undefined) set.awayScore = patch.awayScore;
    await db.update(matches).set(set).where(eq(matches.id, id));
  },

  async setFinished(id: number, homeScore: number, awayScore: number) {
    await db
      .update(matches)
      .set({
        status: "finished",
        homeScore,
        awayScore,
        minute: 90,
        lastSyncedAt: new Date(),
      })
      .where(eq(matches.id, id));
  },

  /** engine: matches currently live (ids + start) */
  async liveIds(): Promise<{ id: number; externalId: string | null; startTime: Date; sportSlug: string }[]> {
    const rows = await db
      .select({
        id: matches.id,
        externalId: matches.externalId,
        startTime: matches.startTime,
        sportSlug: sports.slug,
      })
      .from(matches)
      .innerJoin(sports, eq(sports.id, matches.sportId))
      .where(inArray(matches.status, ["live", "halftime"]));
    return rows;
  },

  async countByStatusToday() {
    const now = new Date();
    const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const to = new Date(from.getTime() + 86400_000 - 1);
    const rows = await db
      .select({ status: matches.status, count: sql<number>`count(*)::int` })
      .from(matches)
      .where(between(matches.startTime, from, to))
      .groupBy(matches.status);
    return rows;
  },

  async venueForMatch(id: number) {
    const rows = await db
      .select({ name: venues.name, city: venues.city })
      .from(matches)
      .innerJoin(venues, eq(venues.id, matches.venueId))
      .where(eq(matches.id, id))
      .limit(1);
    return rows[0] ?? null;
  },
};
