import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { favorites, matches, news, notifications, teams, users } from "@/db/schema";

export const favoritesRepo = {
  async list(userId: number) {
    return db
      .select({
        id: favorites.id,
        type: favorites.favoriteType,
        targetId: favorites.targetId,
        createdAt: favorites.createdAt,
      })
      .from(favorites)
      .where(eq(favorites.userId, userId))
      .orderBy(desc(favorites.createdAt));
  },

  async add(userId: number, type: "team" | "player" | "league", targetId: number) {
    await db
      .insert(favorites)
      .values({ userId, favoriteType: type, targetId })
      .onConflictDoNothing();
  },

  async remove(userId: number, type: "team" | "player" | "league", targetId: number) {
    await db
      .delete(favorites)
      .where(
        and(
          eq(favorites.userId, userId),
          eq(favorites.favoriteType, type),
          eq(favorites.targetId, targetId),
        ),
      );
  },

  async exists(userId: number, type: "team" | "player" | "league", targetId: number) {
    const rows = await db
      .select({ id: favorites.id })
      .from(favorites)
      .where(
        and(
          eq(favorites.userId, userId),
          eq(favorites.favoriteType, type),
          eq(favorites.targetId, targetId),
        ),
      )
      .limit(1);
    return rows.length > 0;
  },

  async favoriteTeamIds(userId: number): Promise<number[]> {
    const rows = await db
      .select({ targetId: favorites.targetId })
      .from(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.favoriteType, "team")));
    return rows.map((r) => r.targetId);
  },

  /** users who favorited a team — for notification fanout. */
  async usersForTeam(teamId: number): Promise<number[]> {
    const rows = await db
      .select({ userId: favorites.userId })
      .from(favorites)
      .where(and(eq(favorites.favoriteType, "team"), eq(favorites.targetId, teamId)));
    return rows.map((r) => r.userId);
  },

  /** hydrated favorites for profile page. */
  async hydrated(userId: number) {
    const teamRows = await db
      .select({ id: teams.id, slug: teams.slug, name: teams.name, shortName: teams.shortName, logoUrl: teams.logoUrl, country: teams.country })
      .from(favorites)
      .innerJoin(teams, eq(teams.id, favorites.targetId))
      .where(and(eq(favorites.userId, userId), eq(favorites.favoriteType, "team")));
    return { teams: teamRows };
  },
};

export const notificationsRepo = {
  async list(userId: number, limit = 20, offset = 0) {
    return db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(offset);
  },

  async unreadCount(userId: number): Promise<number> {
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
    return row?.count ?? 0;
  },

  async insertMany(
    rows: {
      userId: number;
      type: "match_starting" | "match_event" | "match_result" | "system";
      title: string;
      body?: string;
      linkUrl?: string;
    }[],
  ) {
    if (rows.length === 0) return;
    await db.insert(notifications).values(
      rows.map((r) => ({
        userId: r.userId,
        type: r.type,
        title: r.title,
        body: r.body ?? null,
        linkUrl: r.linkUrl ?? null,
      })),
    );
  },

  async markRead(userId: number, ids: number[]) {
    if (ids.length === 0) {
      await db
        .update(notifications)
        .set({ isRead: true })
        .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
      return;
    }
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.userId, userId), sql`${notifications.id} = ANY(${ids})`));
  },

  async purgeOlderThan(days: number): Promise<number> {
    const cutoff = new Date(Date.now() - days * 86400_000);
    const res = await db.delete(notifications).where(sql`${notifications.createdAt} < ${cutoff}`);
    return res.count;
  },
};

export const adminStatsRepo = {
  async dashboard() {
    const [userStats] = await db
      .select({
        totalUsers: sql<number>`count(*)::int`,
        activeToday: sql<number>`count(*) FILTER (WHERE ${users.createdAt} > now() - interval '24 hours')::int`,
      })
      .from(users);
    const [matchStats] = await db
      .select({
        today: sql<number>`count(*) FILTER (WHERE ${matches.startTime}::date = (now() AT TIME ZONE 'utc')::date)::int`,
        live: sql<number>`count(*) FILTER (WHERE ${matches.status} IN ('live','halftime'))::int`,
      })
      .from(matches);
    const [newsStats] = await db
      .select({
        published: sql<number>`count(*) FILTER (WHERE ${news.status} = 'published')::int`,
        today: sql<number>`count(*) FILTER (WHERE ${news.publishedAt} > now() - interval '24 hours')::int`,
        views: sql<number>`COALESCE(SUM(${news.viewCount}), 0)::int`,
      })
      .from(news);
    return {
      totalUsers: userStats?.totalUsers ?? 0,
      activeToday: userStats?.activeToday ?? 0,
      matchesToday: matchStats?.today ?? 0,
      liveMatches: matchStats?.live ?? 0,
      newsPublished: newsStats?.published ?? 0,
      newsToday: newsStats?.today ?? 0,
      totalViews: newsStats?.views ?? 0,
    };
  },
};
