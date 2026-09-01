import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { leagues, sports, teamPlayers, teams, venues } from "@/db/schema";
import type { PlayerDetail, TeamDetail, TeamSummary } from "@/server/services/types";

const teamSelect = {
  id: teams.id,
  slug: teams.slug,
  name: teams.name,
  shortName: teams.shortName,
  logoUrl: teams.logoUrl,
  country: teams.country,
  foundedYear: teams.foundedYear,
  venueName: venues.name,
  venueCity: venues.city,
  venueCapacity: venues.capacity,
  leagueSlug: leagues.slug,
  leagueName: leagues.name,
  sportSlug: sports.slug,
  sportName: sports.name,
  sportEmoji: sports.emoji,
};

function mapTeam(r: {
  id: number; slug: string; name: string; shortName: string | null; logoUrl: string | null;
  country: string | null; foundedYear: number | null; venueName: string | null;
  venueCity: string | null; venueCapacity: number | null; leagueSlug: string | null;
  leagueName: string | null; sportSlug: string; sportName: string; sportEmoji: string | null;
}): TeamDetail {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    shortName: r.shortName,
    logoUrl: r.logoUrl,
    country: r.country,
    foundedYear: r.foundedYear,
    venue: r.venueName ? { name: r.venueName, city: r.venueCity, capacity: r.venueCapacity } : null,
    league: r.leagueSlug ? { slug: r.leagueSlug, name: r.leagueName! } : null,
    sport: { slug: r.sportSlug, name: r.sportName, emoji: r.sportEmoji },
  };
}

function baseTeamQuery() {
  return db
    .select(teamSelect)
    .from(teams)
    .innerJoin(sports, eq(sports.id, teams.sportId))
    .leftJoin(leagues, eq(leagues.id, teams.leagueId))
    .leftJoin(venues, eq(venues.id, teams.venueId));
}

export const teamsRepo = {
  async bySlugOrId(slugOrId: string): Promise<TeamDetail | null> {
    const idNum = Number(slugOrId);
    const rows = Number.isInteger(idNum) && idNum > 0
      ? await baseTeamQuery().where(eq(teams.id, idNum)).limit(1)
      : await baseTeamQuery().where(eq(teams.slug, slugOrId)).limit(1);
    return rows[0] ? mapTeam(rows[0]) : null;
  },

  async search(q: string, limit = 8): Promise<TeamSummary[]> {
    const rows = await db
      .select({
        id: teams.id, slug: teams.slug, name: teams.name,
        shortName: teams.shortName, logoUrl: teams.logoUrl, country: teams.country,
      })
      .from(teams)
      .where(sql`${teams.name} ILIKE ${`%${q}%`} OR ${teams.slug} ILIKE ${`%${q}%`}`)
      .orderBy(sql`similarity(${teams.name}, ${q}) DESC`)
      .limit(limit);
    return rows;
  },

  async byLeague(leagueId: number): Promise<TeamSummary[]> {
    return db
      .select({
        id: teams.id, slug: teams.slug, name: teams.name,
        shortName: teams.shortName, logoUrl: teams.logoUrl, country: teams.country,
      })
      .from(teams)
      .where(eq(teams.leagueId, leagueId))
      .orderBy(asc(teams.name));
  },

  /** Squad with shirt numbers. */
  async squad(teamId: number) {
    return db
      .select({
        playerId: teamPlayers.playerId,
        name: sql<string>`players.name`,
        slug: sql<string>`players.slug`,
        position: sql<string | null>`players.position`,
        nationality: sql<string | null>`players.nationality`,
        birthDate: sql<string | null>`players.birth_date::text`,
        shirtNumber: teamPlayers.shirtNumber,
        isCaptain: teamPlayers.isCaptain,
      })
      .from(teamPlayers)
      .innerJoin(sql`players`, sql`players.id = ${teamPlayers.playerId}`)
      .where(eq(teamPlayers.teamId, teamId))
      .orderBy(asc(teamPlayers.shirtNumber));
  },

  /** Players with match stats derived from events. */
  async playerStats(playerId: number) {
    const [row] = await db
      .select({
        matches: sql<number>`(SELECT count(DISTINCT m.id) FROM matches m
          JOIN match_events ev ON ev.match_id = m.id AND ev.player_id = ${playerId}
          WHERE m.status = 'finished')::int`,
        goals: sql<number>`(SELECT count(*) FROM match_events WHERE player_id = ${playerId} AND type = 'goal')::int`,
        assists: sql<number>`(SELECT count(*) FROM match_events WHERE assist_player_id = ${playerId} AND type = 'goal')::int`,
        yellowCards: sql<number>`(SELECT count(*) FROM match_events WHERE player_id = ${playerId} AND type = 'yellow_card')::int`,
        redCards: sql<number>`(SELECT count(*) FROM match_events WHERE player_id = ${playerId} AND type = 'red_card')::int`,
      })
      .from(sql`(SELECT 1) as t`);
    return row ?? { matches: 0, goals: 0, assists: 0, yellowCards: 0, redCards: 0 };
  },
};

export const playersRepo = {
  async bySlug(slug: string): Promise<PlayerDetail | null> {
    const rows = await db
      .select({
        id: sql<number>`players.id`,
        slug: sql<string>`players.slug`,
        name: sql<string>`players.name`,
        position: sql<string | null>`players.position`,
        nationality: sql<string | null>`players.nationality`,
        birthDate: sql<string | null>`players.birth_date::text`,
        heightCm: sql<number | null>`players.height_cm`,
        avatarUrl: sql<string | null>`players.avatar_url`,
        teamId: teams.id,
        teamSlug: teams.slug,
        teamName: teams.name,
        sportSlug: sports.slug,
        sportName: sports.name,
      })
      .from(sql`players`)
      .leftJoin(teams, eq(teams.id, sql`players.team_id`))
      .innerJoin(sports, eq(sports.id, sql`players.sport_id`))
      .where(sql`players.slug = ${slug}`)
      .limit(1);
    const r = rows[0];
    if (!r) return null;
    return {
      id: r.id,
      slug: r.slug,
      name: r.name,
      position: r.position,
      nationality: r.nationality,
      birthDate: r.birthDate,
      heightCm: r.heightCm,
      avatarUrl: r.avatarUrl,
      team: r.teamId ? { id: r.teamId, slug: r.teamSlug!, name: r.teamName! } : null,
      sport: { slug: r.sportSlug, name: r.sportName },
    };
  },

  async search(q: string, limit = 8): Promise<PlayerDetail[]> {
    const rows = await db
      .select({
        id: sql<number>`players.id`,
        slug: sql<string>`players.slug`,
        name: sql<string>`players.name`,
        position: sql<string | null>`players.position`,
        nationality: sql<string | null>`players.nationality`,
        birthDate: sql<string | null>`players.birth_date::text`,
        heightCm: sql<number | null>`players.height_cm`,
        avatarUrl: sql<string | null>`players.avatar_url`,
        teamId: teams.id,
        teamSlug: teams.slug,
        teamName: teams.name,
        sportSlug: sports.slug,
        sportName: sports.name,
      })
      .from(sql`players`)
      .leftJoin(teams, eq(teams.id, sql`players.team_id`))
      .innerJoin(sports, eq(sports.id, sql`players.sport_id`))
      .where(sql`players.name ILIKE ${`%${q}%`}`)
      .orderBy(sql`similarity(players.name, ${q}) DESC`)
      .limit(limit);
    return rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      position: r.position,
      nationality: r.nationality,
      birthDate: r.birthDate,
      heightCm: r.heightCm,
      avatarUrl: r.avatarUrl,
      team: r.teamId ? { id: r.teamId, slug: r.teamSlug!, name: r.teamName! } : null,
      sport: { slug: r.sportSlug, name: r.sportName },
    }));
  },

  async listByTeam(teamId: number, limit = 50) {
    return db
      .select({
        id: sql<number>`players.id`,
        slug: sql<string>`players.slug`,
        name: sql<string>`players.name`,
        position: sql<string | null>`players.position`,
      })
      .from(sql`players`)
      .where(sql`players.team_id = ${teamId}`)
      .orderBy(asc(sql`players.name`))
      .limit(limit);
  },
};
