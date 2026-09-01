import { matchesRepo, type MatchQueryResult } from "@/server/repositories/matches.repo";
import { leaguesRepo } from "@/server/repositories/leagues.repo";
import { cached, invalidate } from "@/server/cache";
import type {
  MatchWithTeams,
  MatchDetail,
  MatchListFilters,
  Paginated,
  PaginationMeta,
} from "@/server/services/types";

function toDto(r: MatchQueryResult): MatchWithTeams {
  return {
    id: r.id,
    startTime: r.startTime.toISOString(),
    status: r.status,
    minute: r.minute,
    homeScore: r.homeScore,
    awayScore: r.awayScore,
    league: { slug: r.leagueSlug, name: r.leagueName },
    sport: { slug: r.sportSlug, name: r.sportName, emoji: r.sportEmoji },
    homeTeam: {
      id: r.homeTeamId,
      slug: r.homeTeamSlug,
      name: r.homeTeamName,
      shortName: r.homeTeamShort,
      logoUrl: null,
    },
    awayTeam: {
      id: r.awayTeamId,
      slug: r.awayTeamSlug,
      name: r.awayTeamName,
      shortName: r.awayTeamShort,
      logoUrl: null,
    },
    postponedReason: r.postponedReason,
  };
}

const perPageOf = (f: MatchListFilters) => Math.min(f.perPage ?? 20, 50);
const pageOf = (f: MatchListFilters) => Math.max(f.page ?? 1, 1);

function metaOf(total: number, page: number, perPage: number): PaginationMeta {
  return {
    page,
    perPage,
    total,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
    hasNext: page * perPage < total,
  };
}

export const matchesService = {
  /** LIVE — TTL 5s per WORKPLAN §5.2. */
  async getLiveMatches(): Promise<MatchWithTeams[]> {
    return cached("v1:live:all", 5, async () => {
      const rows = await matchesRepo.live();
      return rows.map(toDto);
    });
  },

  async getUpcomingMatches(f: MatchListFilters): Promise<Paginated<MatchWithTeams>> {
    const page = pageOf(f);
    const perPage = perPageOf(f);
    const key = `v1:schedule:${JSON.stringify({ ...f, page, perPage })}`;
    return cached(key, 300, async () => {
      const { items, total } = await matchesRepo.upcoming(f, perPage, (page - 1) * perPage);
      return { items: items.map(toDto), meta: metaOf(total, page, perPage) };
    });
  },

  async getMatchResults(f: MatchListFilters): Promise<Paginated<MatchWithTeams>> {
    const page = pageOf(f);
    const perPage = perPageOf(f);
    const key = `v1:results:${JSON.stringify({ ...f, page, perPage })}`;
    return cached(key, 300, async () => {
      const { items, total } = await matchesRepo.results(f, perPage, (page - 1) * perPage);
      return { items: items.map(toDto), meta: metaOf(total, page, perPage) };
    });
  },

  async listMatches(f: MatchListFilters): Promise<Paginated<MatchWithTeams>> {
    const page = pageOf(f);
    const perPage = perPageOf(f);
    const { items, total } = await matchesRepo.list(f, perPage, (page - 1) * perPage);
    return { items: items.map(toDto), meta: metaOf(total, page, perPage) };
  },

  /** Detail: live matches short TTL; finished cached 30m. */
  async getMatchDetail(id: number): Promise<MatchDetail | null> {
    const base = await matchesRepo.byId(id);
    if (!base) return null;
    const dto = toDto(base);

    if (dto.status === "finished") {
      return cached(`v1:match:detail:${id}`, 1800, async () =>
        buildDetail(dto, base.homeTeamId, base.awayTeamId, base.leagueSlug),
      );
    }
    return buildDetail(dto, base.homeTeamId, base.awayTeamId, base.leagueSlug);
  },

  async invalidateMatch(id: number) {
    await invalidate(`v1:match:detail:${id}`);
    await invalidate("v1:live:all");
  },

  /** Engine hook — called after tick updates. */
  async onMatchChanged(id: number) {
    await invalidate("v1:live:all");
    await invalidate(`v1:match:detail:${id}`);
    await invalidate("v1:results:");
    await invalidate("v1:schedule:");
  },
};

async function buildDetail(
  dto: MatchWithTeams,
  homeTeamId: number,
  awayTeamId: number,
  _leagueSlug?: string,
): Promise<MatchDetail> {
  const { db } = await import("@/db");
  const { matchEvents, matchStatistics, matchLineups, teams: teamsTable } = await import(
    "@/db/schema"
  );
  const { eq, asc } = await import("drizzle-orm");

  const [venue, events, stats, lineups, h2hRecent, h2hSummary] = await Promise.all([
    matchesRepo.venueForMatch(dto.id),
    db
      .select({
        id: matchEvents.id,
        minute: matchEvents.minute,
        type: matchEvents.type,
        teamId: matchEvents.teamId,
        detail: matchEvents.detail,
        teamName: teamsTable.name,
        teamSlug: teamsTable.slug,
      })
      .from(matchEvents)
      .leftJoin(teamsTable, eq(teamsTable.id, matchEvents.teamId))
      .where(eq(matchEvents.matchId, dto.id))
      .orderBy(asc(matchEvents.minute)),
    db
      .select({
        statKey: matchStatistics.statKey,
        homeValue: matchStatistics.homeValue,
        awayValue: matchStatistics.awayValue,
      })
      .from(matchStatistics)
      .where(eq(matchStatistics.matchId, dto.id))
      .orderBy(asc(matchStatistics.statKey)),
    db
      .select()
      .from(matchLineups)
      .where(eq(matchLineups.matchId, dto.id)),
    matchesRepo.h2h(homeTeamId, awayTeamId, 5),
    matchesRepo.h2hSummary(homeTeamId, awayTeamId),
  ]);

  // derive stats from events if statistics table empty (mock data path)
  let statistics = stats.map((s) => ({
    key: s.statKey,
    label: STAT_LABELS[s.statKey] ?? s.statKey,
    home: s.homeValue,
    away: s.awayValue,
  }));
  if (statistics.length === 0 && (dto.homeScore ?? 0) + (dto.awayScore ?? 0) >= 0) {
    statistics = deriveStats(dto, events.map((e) => ({ type: e.type, teamId: e.teamId })));
  }

  const commentary =
    dto.status === "scheduled"
      ? []
      : events.map((e) => ({
          minute: e.minute,
          text: eventText(e),
        }));

  return {
    ...dto,
    venue: venue ? { name: venue.name, city: venue.city } : null,
    events: events.map((e) => ({
      id: e.id,
      minute: e.minute,
      type: e.type,
      teamId: e.teamId,
      teamName: e.teamName,
      teamSlug: e.teamSlug,
      detail: e.detail,
    })),
    statistics,
    lineups: lineups.map((l) => ({
      teamId: l.teamId,
      teamSlug: "",
      teamName: l.teamId === homeTeamId ? dto.homeTeam.name : dto.awayTeam.name,
      formation: l.formation,
      coachName: l.coachName,
      isHome: l.isHome,
      players: (l.players as unknown as { playerId: number; name: string; shirtNumber: number | null; position: string | null; x: number; y: number }[]).map((p) => ({
        playerId: p.playerId,
        name: p.name,
        shirtNumber: p.shirtNumber,
        position: p.position,
        x: p.x,
        y: p.y,
      })),
    })),
    h2h: {
      summary: {
        total: h2hSummary.total,
        homeWin: h2hSummary.aWin,
        awayWin: h2hSummary.bWin,
        draw: h2hSummary.draw,
        goals: h2hSummary.goals,
      },
      recent: h2hRecent.map(toDto),
    },
    commentary,
  };
}

function eventText(e: { type: string; teamName?: string | null; detail?: string | null }): string {
  const t = e.teamName ?? "";
  switch (e.type) {
    case "goal":
      return `⚽ BÀN THẮNG! ${t} ghi bàn${e.detail ? ` (${e.detail})` : ""}`;
    case "yellow_card":
      return `🟨 Thẻ vàng cho ${t}`;
    case "red_card":
      return `🟥 Thẻ đỏ cho ${t}`;
    case "substitution":
      return `🔄 ${t} thay người`;
    case "var":
      return `📺 VAR đang kiểm tra tình huống liên quan ${t}`;
    case "penalty":
      return `Penalty cho ${t}`;
    default:
      return `${e.detail ?? "Diễn biến trận đấu"} — ${t}`;
  }
}

/** Deterministic pseudo-stats derived from score + events — keeps UI rich for mock data. */
function deriveStats(
  m: MatchWithTeams,
  events: { type: string; teamId: number | null }[],
): { key: string; label: string; home: string; away: string }[] {
  const seed = m.id * 2654435761;
  const rand = (n: number) => Math.abs(Math.sin(seed * (n + 1)) * 1000) % 1;
  const homeGoals = events.filter((e) => e.type === "goal" && e.teamId === m.homeTeam.id).length;
  const awayGoals = events.filter((e) => e.type === "goal" && e.teamId === m.awayTeam.id).length;
  const possessionH = 40 + Math.round(rand(1) * 20) + homeGoals * 2;
  return [
    { key: "possession", label: STAT_LABELS.possession!, home: `${possessionH}%`, away: `${100 - possessionH}%` },
    { key: "shots", label: STAT_LABELS.shots!, home: String(6 + homeGoals * 2 + Math.round(rand(2) * 8)), away: String(4 + awayGoals * 2 + Math.round(rand(3) * 8)) },
    { key: "shots_on_target", label: STAT_LABELS.shots_on_target!, home: String(2 + homeGoals + Math.round(rand(4) * 4)), away: String(1 + awayGoals + Math.round(rand(5) * 4)) },
    { key: "corners", label: STAT_LABELS.corners!, home: String(2 + Math.round(rand(6) * 8)), away: String(1 + Math.round(rand(7) * 8)) },
    { key: "fouls", label: STAT_LABELS.fouls!, home: String(6 + Math.round(rand(8) * 10)), away: String(6 + Math.round(rand(9) * 10)) },
    { key: "yellow_cards", label: STAT_LABELS.yellow_cards!, home: String(events.filter((e) => e.type === "yellow_card" && e.teamId === m.homeTeam.id).length), away: String(events.filter((e) => e.type === "yellow_card" && e.teamId === m.awayTeam.id).length) },
  ];
}

const STAT_LABELS: Record<string, string> = {
  possession: "Kiểm soát bóng",
  shots: "Sút",
  shots_on_target: "Sút trúng đích",
  corners: "Phạt góc",
  fouls: "Phạm lỗi",
  yellow_cards: "Thẻ vàng",
  red_cards: "Thẻ đỏ",
  passes: "Đường chuyền",
  attack: "Tấn công",
};

export { leaguesRepo };
