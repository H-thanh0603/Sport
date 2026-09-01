import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { leagues, seasons, sports, standings, teams } from "@/db/schema";
import type { LeagueSummary, StandingRow } from "@/server/services/types";

export const leaguesRepo = {
  async list(sportSlug?: string): Promise<LeagueSummary[]> {
    const rows = await db
      .select({
        id: leagues.id,
        slug: leagues.slug,
        name: leagues.name,
        country: leagues.country,
        logoUrl: leagues.logoUrl,
        isPopular: leagues.isPopular,
        sportSlug: sports.slug,
        sportName: sports.name,
        sportEmoji: sports.emoji,
      })
      .from(leagues)
      .innerJoin(sports, eq(sports.id, leagues.sportId))
      .where(sportSlug ? eq(sports.slug, sportSlug) : undefined)
      .orderBy(desc(leagues.isPopular), asc(leagues.name));
    return rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      country: r.country,
      logoUrl: r.logoUrl,
      isPopular: r.isPopular,
      sport: { slug: r.sportSlug, name: r.sportName, emoji: r.sportEmoji },
    }));
  },

  async popular(limit = 8): Promise<LeagueSummary[]> {
    const rows = await db
      .select({
        id: leagues.id,
        slug: leagues.slug,
        name: leagues.name,
        country: leagues.country,
        logoUrl: leagues.logoUrl,
        isPopular: leagues.isPopular,
        sportSlug: sports.slug,
        sportName: sports.name,
        sportEmoji: sports.emoji,
      })
      .from(leagues)
      .innerJoin(sports, eq(sports.id, leagues.sportId))
      .where(eq(leagues.isPopular, true))
      .orderBy(asc(leagues.name))
      .limit(limit);
    return rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      country: r.country,
      logoUrl: r.logoUrl,
      isPopular: r.isPopular,
      sport: { slug: r.sportSlug, name: r.sportName, emoji: r.sportEmoji },
    }));
  },

  async bySlug(slug: string) {
    const rows = await db
      .select({
        id: leagues.id,
        slug: leagues.slug,
        name: leagues.name,
        country: leagues.country,
        logoUrl: leagues.logoUrl,
        isPopular: leagues.isPopular,
        sportSlug: sports.slug,
        sportName: sports.name,
        sportEmoji: sports.emoji,
      })
      .from(leagues)
      .innerJoin(sports, eq(sports.id, leagues.sportId))
      .where(eq(leagues.slug, slug))
      .limit(1);
    return rows[0] ?? null;
  },

  async currentSeason(leagueId: number) {
    const rows = await db
      .select({ id: seasons.id, name: seasons.name })
      .from(seasons)
      .where(and(eq(seasons.leagueId, leagueId), eq(seasons.isCurrent, true)))
      .limit(1);
    return rows[0] ?? null;
  },

  async standings(seasonId: number): Promise<StandingRow[]> {
    const rows = await db
      .select({
        position: standings.position,
        previousPosition: standings.previousPosition,
        teamId: teams.id,
        teamSlug: teams.slug,
        teamName: teams.name,
        teamShort: teams.shortName,
        teamLogo: teams.logoUrl,
        played: standings.played,
        won: standings.won,
        drawn: standings.drawn,
        lost: standings.lost,
        goalsFor: standings.goalsFor,
        goalsAgainst: standings.goalsAgainst,
        points: standings.points,
        form: standings.form,
      })
      .from(standings)
      .innerJoin(teams, eq(teams.id, standings.teamId))
      .where(eq(standings.seasonId, seasonId))
      .orderBy(asc(standings.position));
    return rows.map((r) => ({
      position: r.position,
      previousPosition: r.previousPosition,
      team: {
        id: r.teamId,
        slug: r.teamSlug,
        name: r.teamName,
        shortName: r.teamShort,
        logoUrl: r.teamLogo,
      },
      played: r.played,
      won: r.won,
      drawn: r.drawn,
      lost: r.lost,
      goalsFor: r.goalsFor,
      goalsAgainst: r.goalsAgainst,
      goalDiff: r.goalsFor - r.goalsAgainst,
      points: r.points,
      form: r.form,
    }));
  },

  /** Sync job snapshot: current position becomes previous before recompute. */
  async snapshotPositions(seasonId: number) {
    await db
      .update(standings)
      .set({ previousPosition: sql`${standings.position}` })
      .where(eq(standings.seasonId, seasonId));
  },
};
