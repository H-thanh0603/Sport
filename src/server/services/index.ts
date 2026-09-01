import { leaguesRepo } from "@/server/repositories/leagues.repo";
import { teamsRepo, playersRepo } from "@/server/repositories/teams.repo";
import { newsRepo, type NewsFilters } from "@/server/repositories/news.repo";
import { searchRepo } from "@/server/repositories/search.repo";
import { favoritesRepo, notificationsRepo } from "@/server/repositories/engagement.repo";
import { cached } from "@/server/cache";
import type {
  LeagueSummary,
  NewsCard,
  Paginated,
  PlayerDetail,
  StandingRow,
  TeamDetail,
  TeamSummary,
  SearchResults,
} from "@/server/services/types";
import { notFound } from "@/server/http/api";

export const leaguesService = {
  async list(sportSlug?: string): Promise<LeagueSummary[]> {
    return cached(`v1:leagues:${sportSlug ?? "all"}`, 600, () => leaguesRepo.list(sportSlug));
  },
  async popular(): Promise<LeagueSummary[]> {
    return cached("v1:leagues:popular", 600, () => leaguesRepo.popular());
  },
  async bySlug(slug: string) {
    const league = await leaguesRepo.bySlug(slug);
    if (!league) throw notFound("league");
    return league;
  },
  async standings(slug: string): Promise<StandingRow[]> {
    return cached(`v1:standings:${slug}`, 300, async () => {
      const league = await leaguesRepo.bySlug(slug);
      if (!league) throw notFound("league");
      const season = await leaguesRepo.currentSeason(league.id);
      if (!season) return [];
      return leaguesRepo.standings(season.id);
    });
  },
  async teams(slug: string): Promise<TeamSummary[]> {
    const league = await leaguesRepo.bySlug(slug);
    if (!league) throw notFound("league");
    return cached(`v1:league:teams:${slug}`, 600, () => teamsRepo.byLeague(league!.id));
  },
};

export const teamsService = {
  async bySlugOrId(slugOrId: string): Promise<TeamDetail> {
    const team = await teamsRepo.bySlugOrId(slugOrId);
    if (!team) throw notFound("team");
    return team;
  },
  async squad(teamId: number) {
    return teamsRepo.squad(teamId);
  },
};

export const playersService = {
  async bySlug(slug: string): Promise<PlayerDetail> {
    const player = await playersRepo.bySlug(slug);
    if (!player) throw notFound("player");
    return player;
  },
  async stats(playerId: number) {
    return teamsRepo.playerStats(playerId);
  },
  async newsFor(playerName: string, limit = 3): Promise<NewsCard[]> {
    // lazy: search news by player name
    const res = await searchRepo.all(playerName, limit);
    return res.news;
  },
};

export const newsService = {
  async list(f: NewsFilters): Promise<Paginated<NewsCard>> {
    const page = f.page ?? 1;
    const perPage = Math.min(f.perPage ?? 12, 30);
    const key = `v1:news:list:${JSON.stringify({ ...f, page, perPage })}`;
    return cached(key, 120, () => newsRepo.list(f, perPage, (page - 1) * perPage));
  },
  async trending(): Promise<NewsCard[]> {
    return cached("v1:news:trending", 120, () => newsRepo.trending());
  },
  async bySlug(slug: string) {
    const article = await newsRepo.bySlug(slug);
    if (!article) throw notFound("news");
    return article;
  },
  async related(slug: string) {
    const article = await newsRepo.bySlug(slug);
    if (!article) return [];
    return newsRepo.related(article.id, 4);
  },
  async categories() {
    return cached("v1:news:categories", 3600, () => newsRepo.categories());
  },
  async recordView(newsId: number) {
    await newsRepo.incrementViews(newsId);
  },
  async comments(newsId: number) {
    return newsRepo.comments(newsId);
  },
};

export const searchService = {
  async all(q: string, limit = 5): Promise<SearchResults> {
    const key = `v1:search:${q.toLowerCase()}:${limit}`;
    return cached(key, 60, () => searchRepo.all(q, limit));
  },
  async suggest(q: string) {
    const key = `v1:search:suggest:${q.toLowerCase()}`;
    return cached(key, 600, () => searchRepo.suggest(q));
  },
};

export const favoritesService = {
  async list(userId: number) {
    return favoritesRepo.list(userId);
  },
  async hydrated(userId: number) {
    return favoritesRepo.hydrated(userId);
  },
  async toggle(userId: number, type: "team" | "player" | "league", targetId: number) {
    const exists = await favoritesRepo.exists(userId, type, targetId);
    if (exists) {
      await favoritesRepo.remove(userId, type, targetId);
      return { favorited: false };
    }
    await favoritesRepo.add(userId, type, targetId);
    return { favorited: true };
  },
  async exists(userId: number, type: "team" | "player" | "league", targetId: number) {
    return favoritesRepo.exists(userId, type, targetId);
  },
  /** team ids user follows — for personalized home. */
  async favoriteTeamIds(userId: number) {
    return favoritesRepo.favoriteTeamIds(userId);
  },
};

export const notificationsService = {
  async list(userId: number) {
    const [items, unread] = await Promise.all([
      notificationsRepo.list(userId),
      notificationsRepo.unreadCount(userId),
    ]);
    return { items, unread };
  },
  async markRead(userId: number, ids?: number[]) {
    await notificationsRepo.markRead(userId, ids ?? []);
  },
};
