import { sql } from "drizzle-orm";
import { db } from "@/db";
import type { SearchResults } from "@/server/services/types";
import type { LeagueSummary, NewsCard, PlayerDetail, TeamSummary } from "@/server/services/types";

/**
 * Trigram search — typo tolerant via pg_trgm similarity, ranked.
 */
export const searchRepo = {
  async all(q: string, limit = 5): Promise<SearchResults> {
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      return { teams: [], players: [], leagues: [], news: [], total: 0 };
    }
    const like = `%${trimmed}%`;
    const words = trimmed.split(/\s+/).slice(0, 4);
    const prefixWord = `${words[0]}%`;

    const teams = (await db.execute(sql`
      SELECT t.id, t.slug, t.name, t.short_name AS "shortName", t.logo_url AS "logoUrl", t.country
      FROM teams t
      WHERE t.name ILIKE ${like}
         OR t.short_name ILIKE ${like}
         OR t.name ILIKE ${prefixWord}
         OR t.name <% ${trimmed}
      ORDER BY similarity(t.name, ${trimmed}) DESC, t.name ASC
      LIMIT ${limit}
    `)) as unknown as TeamSummary[];

    const playersRaw = (await db.execute(sql`
      SELECT p.id, p.slug, p.name, p.position, p.nationality,
             p.birth_date::text AS "birthDate", p.height_cm AS "heightCm", p.avatar_url AS "avatarUrl",
             te.id AS "teamId", te.slug AS "teamSlug", te.name AS "teamName",
             s.slug AS "sportSlug", s.name AS "sportName"
      FROM players p
      LEFT JOIN teams te ON te.id = p.team_id
      JOIN sports s ON s.id = p.sport_id
      WHERE p.name ILIKE ${like} OR p.name <% ${trimmed}
      ORDER BY similarity(p.name, ${trimmed}) DESC, p.name ASC
      LIMIT ${limit}
    `)) as unknown as (Omit<PlayerDetail, "team" | "sport"> & {
      teamId: number | null;
      teamSlug: string | null;
      teamName: string | null;
      sportSlug: string;
      sportName: string;
    })[];

    const leaguesRaw = (await db.execute(sql`
      SELECT l.id, l.slug, l.name, l.country, l.logo_url AS "logoUrl", l.is_popular AS "isPopular",
             s.slug AS "sportSlug", s.name AS "sportName", s.emoji AS "sportEmoji"
      FROM leagues l
      JOIN sports s ON s.id = l.sport_id
      WHERE l.name ILIKE ${like} OR l.name <% ${trimmed}
      ORDER BY similarity(l.name, ${trimmed}) DESC, l.name ASC
      LIMIT ${limit}
    `)) as unknown as (Omit<LeagueSummary, "sport"> & {
      sportSlug: string;
      sportName: string;
      sportEmoji: string | null;
    })[];

    const newsRaw = (await db.execute(sql`
      SELECT n.id, n.slug, n.title, n.excerpt, n.cover_image_url AS "coverImageUrl",
             c.slug AS "categorySlug", c.name AS "categoryName",
             u.display_name AS "authorName",
             n.published_at::text AS "publishedAt", n.view_count AS "viewCount",
             n.reading_minutes AS "readingMinutes", n.is_breaking AS "isBreaking",
             n.is_featured AS "isFeatured"
      FROM news n
      JOIN news_categories c ON c.id = n.category_id
      LEFT JOIN users u ON u.id = n.author_id
      WHERE n.status = 'published' AND (n.title ILIKE ${like} OR n.title <% ${trimmed})
      ORDER BY similarity(n.title, ${trimmed}) DESC, n.published_at DESC
      LIMIT ${limit}
    `)) as unknown as (Omit<NewsCard, "category"> & {
      categorySlug: string;
      categoryName: string;
    })[];

    return {
      teams,
      players: playersRaw.map((p) => ({
        id: p.id,
        slug: p.slug,
        name: p.name,
        position: p.position,
        nationality: p.nationality,
        birthDate: p.birthDate,
        heightCm: p.heightCm,
        avatarUrl: p.avatarUrl,
        team: p.teamId ? { id: p.teamId, slug: p.teamSlug!, name: p.teamName! } : null,
        sport: { slug: p.sportSlug, name: p.sportName },
      })),
      leagues: leaguesRaw.map((l) => ({
        id: l.id,
        slug: l.slug,
        name: l.name,
        country: l.country,
        logoUrl: l.logoUrl,
        isPopular: l.isPopular,
        sport: { slug: l.sportSlug, name: l.sportName, emoji: l.sportEmoji },
      })),
      news: newsRaw.map((n) => ({
        id: n.id,
        slug: n.slug,
        title: n.title,
        excerpt: n.excerpt,
        coverImageUrl: n.coverImageUrl,
        category: { slug: n.categorySlug, name: n.categoryName },
        authorName: n.authorName,
        publishedAt: n.publishedAt,
        viewCount: n.viewCount,
        readingMinutes: n.readingMinutes,
        isBreaking: n.isBreaking,
        isFeatured: n.isFeatured,
      })),
      total: teams.length + playersRaw.length + leaguesRaw.length + newsRaw.length,
    };
  },

  /** Lightweight suggest for autocomplete. */
  async suggest(q: string, limit = 8) {
    const trimmed = q.trim();
    if (trimmed.length < 2) return [];
    const like = `%${trimmed}%`;
    const rows = (await db.execute(sql`
      (SELECT 'team' AS type, t.slug, t.name FROM teams t
        WHERE t.name ILIKE ${like}
        ORDER BY similarity(t.name, ${trimmed}) DESC LIMIT 3)
      UNION ALL
      (SELECT 'player' AS type, p.slug, p.name FROM players p
        WHERE p.name ILIKE ${like}
        ORDER BY similarity(p.name, ${trimmed}) DESC LIMIT 3)
      UNION ALL
      (SELECT 'league' AS type, l.slug, l.name FROM leagues l
        WHERE l.name ILIKE ${like}
        ORDER BY similarity(l.name, ${trimmed}) DESC LIMIT 2)
      LIMIT ${limit}
    `)) as unknown as { type: string; slug: string; name: string }[];
    return rows;
  },
};
