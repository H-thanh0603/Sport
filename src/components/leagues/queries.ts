import { leaguesRepo } from "@/server/repositories/leagues.repo";
import { leaguesService, playersService, searchService, teamsService } from "@/server/services";
import { matchesService } from "@/server/services/matches.service";
import type { LeagueSummary, NewsCard, StandingRow } from "@/server/services/types";

/**
 * Data-access của Gói D — thin wrapper gọi services/repos của A theo contract 5.1.
 * Query trực tiếp DB chỉ qua repository (mục 0.7).
 */

export type {
  MatchWithTeams,
  MatchStatus,
  StandingRow,
  TeamDetail,
  TeamSummary,
  PlayerDetail,
  PlayerStats,
  LeagueSummary,
  NewsCard,
} from "@/server/services/types";

export const getTeamBySlug = (slug: string) => teamsService.bySlugOrId(slug);

export async function getTeamMatches(teamId: number) {
  const [upcoming, results] = await Promise.all([
    matchesService.getUpcomingMatches({ teamId, perPage: 10 }),
    matchesService.getMatchResults({ teamId, perPage: 10 }),
  ]);
  return { upcoming: upcoming.items, results: results.items };
}

export const getTeamSquad = (teamId: number) => teamsService.squad(teamId);

export async function getTeamNews(leagueSlug: string | null): Promise<NewsCard[]> {
  if (!leagueSlug) return [];
  const res = await searchService.all(leagueSlug, 3);
  return res.news;
}

export async function getTeamStandings(leagueSlug: string, teamId: number): Promise<StandingRow | null> {
  const rows = await leaguesService.standings(leagueSlug);
  return rows.find((r) => r.team.id === teamId) ?? null;
}

export type TeamStats = { played: number; won: number; drawn: number; lost: number; goalsFor: number; goalsAgainst: number };

/** Stats đội tính từ standings mùa hiện tại của giải. */
export async function getTeamStats(leagueSlug: string | null, teamId: number): Promise<TeamStats | null> {
  if (!leagueSlug) return null;
  const row = await getTeamStandings(leagueSlug, teamId);
  if (!row) return null;
  return {
    played: row.played, won: row.won, drawn: row.drawn, lost: row.lost,
    goalsFor: row.goalsFor, goalsAgainst: row.goalsAgainst,
  };
}

export const getPlayerBySlug = (slug: string) => playersService.bySlug(slug);
export const getPlayerStats = (playerId: number) => playersService.stats(playerId);
export const getPlayerNews = (playerName: string) => playersService.newsFor(playerName, 3);

/**
 * Coach của team — không có bảng coaches (schema không có), lấy từ lineup gần nhất
 * có coach_name trong match_lineups (chú thích WORKPLAN mục 8).
 * ponytail: khi A thêm bảng coaches + repo, thay bằng teamsService.coach().
 */
export async function getTeamCoach(teamId: number): Promise<string | null> {
  const { db } = await import("@/db");
  const { sql } = await import("drizzle-orm");
  const rows = await db.execute<{ coachName: string | null }>(sql`
    SELECT ml.coach_name AS "coachName"
    FROM match_lineups ml
    JOIN matches m ON m.id = ml.match_id
    WHERE ml.team_id = ${teamId} AND ml.coach_name IS NOT NULL
    ORDER BY m.start_time DESC
    LIMIT 1
  `);
  return rows[0]?.coachName ?? null;
}

/** Normalize league flat row từ repo → LeagueSummary nested theo contract. */
export async function getLeagueBySlug(slug: string): Promise<LeagueSummary | null> {
  const l = await leaguesRepo.bySlug(slug);
  if (!l) return null;
  return {
    id: l.id, slug: l.slug, name: l.name, country: l.country,
    logoUrl: l.logoUrl, isPopular: l.isPopular,
    sport: { slug: l.sportSlug, name: l.sportName, emoji: l.sportEmoji },
  };
}

export async function getLeagueMatches(leagueSlug: string) {
  const [upcoming, results] = await Promise.all([
    matchesService.getUpcomingMatches({ league: leagueSlug, perPage: 15 }),
    matchesService.getMatchResults({ league: leagueSlug, perPage: 15 }),
  ]);
  return { upcoming: upcoming.items, results: results.items };
}

export const getLeagueStandings = (slug: string) => leaguesService.standings(slug);
export const getLeagueTeams = (slug: string) => leaguesService.teams(slug);
export const getLeagueNews = async (slug: string): Promise<NewsCard[]> => {
  const res = await searchService.all(slug, 3);
  return res.news;
};

export const getCurrentSeason = (leagueId: number) => leaguesRepo.currentSeason(leagueId);

export const getPopularLeagues = () => leaguesService.popular();
export const getAllLeagues = (sportSlug?: string) => leaguesService.list(sportSlug);

export type TopScorer = {
  playerId: number; slug: string; name: string;
  teamSlug: string; teamName: string; goals: number;
};

/** Top ghi bàn của giải — tính từ match_events (ponytail: chuyển sang repo của A khi có). */
export async function getLeagueTopScorers(leagueId: number): Promise<TopScorer[]> {
  const { db } = await import("@/db");
  const { sql } = await import("drizzle-orm");
  return db.execute<TopScorer>(sql`
    SELECT p.id AS "playerId", p.slug, p.name, t.slug AS "teamSlug", t.name AS "teamName",
           COUNT(*)::int AS goals
    FROM match_events me
    JOIN players p ON p.id = me.player_id
    JOIN teams t ON t.id = p.team_id
    JOIN matches m ON m.id = me.match_id
    WHERE m.league_id = ${leagueId} AND me.type = 'goal'
    GROUP BY p.id, p.slug, p.name, t.slug, t.name
    ORDER BY goals DESC, p.name
    LIMIT 10
  `);
}

/** Bàn thắng mỗi cầu thủ của đội — cột thống kê squad (ponytail: chuyển sang repo của A khi có). */
export async function getTeamPlayerGoals(teamId: number): Promise<Record<number, number>> {
  const { db } = await import("@/db");
  const { sql } = await import("drizzle-orm");
  const rows = await db.execute<{ playerId: number; goals: number }>(sql`
    SELECT me.player_id AS "playerId", COUNT(*)::int AS goals
    FROM match_events me
    WHERE me.type = 'goal'
      AND me.player_id IN (SELECT player_id FROM team_players WHERE team_id = ${teamId})
    GROUP BY me.player_id
  `);
  return Object.fromEntries(rows.map((r) => [r.playerId, r.goals]));
}
