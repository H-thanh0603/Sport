import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { comments, news, newsCategories, newsTagLinks, newsTags, users } from "@/db/schema";
import type { NewsCard, NewsDetail, Paginated } from "@/server/services/types";
import type { PaginationMeta } from "@/server/services/types";

export type NewsFilters = {
  category?: string;
  sport?: string;
  featured?: boolean;
  breaking?: boolean;
  sort?: "latest" | "views";
  page?: number;
  perPage?: number;
};

const newsSelect = {
  id: news.id,
  slug: news.slug,
  title: news.title,
  excerpt: news.excerpt,
  coverImageUrl: news.coverImageUrl,
  categorySlug: newsCategories.slug,
  categoryName: newsCategories.name,
  authorName: users.displayName,
  publishedAt: news.publishedAt,
  viewCount: news.viewCount,
  readingMinutes: news.readingMinutes,
  isBreaking: news.isBreaking,
  isFeatured: news.isFeatured,
};

function mapCard(r: {
  id: number; slug: string; title: string; excerpt: string; coverImageUrl: string | null;
  categorySlug: string; categoryName: string; authorName: string | null;
  publishedAt: Date | null; viewCount: number; readingMinutes: number;
  isBreaking: boolean; isFeatured: boolean;
}): NewsCard {
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    excerpt: r.excerpt,
    coverImageUrl: r.coverImageUrl,
    category: { slug: r.categorySlug, name: r.categoryName },
    authorName: r.authorName,
    publishedAt: r.publishedAt ? r.publishedAt.toISOString() : null,
    viewCount: r.viewCount,
    readingMinutes: r.readingMinutes,
    isBreaking: r.isBreaking,
    isFeatured: r.isFeatured,
  };
}

function baseNewsQuery() {
  return db
    .select(newsSelect)
    .from(news)
    .innerJoin(newsCategories, eq(newsCategories.id, news.categoryId))
    .leftJoin(users, eq(users.id, news.authorId));
}

function publishedCond() {
  return eq(news.status, "published");
}

export const newsRepo = {
  async list(f: NewsFilters, limit: number, offset: number): Promise<Paginated<NewsCard>> {
    const conds = [publishedCond()];
    if (f.category) conds.push(eq(newsCategories.slug, f.category));
    if (f.featured) conds.push(eq(news.isFeatured, true));
    if (f.breaking) conds.push(eq(news.isBreaking, true));
    const where = and(...conds);
    const order = f.sort === "views" ? desc(news.viewCount) : desc(news.publishedAt);
    const items = await baseNewsQuery().where(where).orderBy(order).limit(limit).offset(offset);
    const countRows = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(news)
      .innerJoin(newsCategories, eq(newsCategories.id, news.categoryId))
      .where(where);
    const count = countRows[0]?.count ?? 0;
    const meta: PaginationMeta = {
      page: Math.floor(offset / limit) + 1,
      perPage: limit,
      total: count,
      totalPages: Math.max(1, Math.ceil(count / limit)),
      hasNext: offset + limit < count,
    };
    return { items: items.map(mapCard), meta };
  },

  async trending(limit = 6): Promise<NewsCard[]> {
    const rows = await baseNewsQuery()
      .where(and(publishedCond(), gte(news.publishedAt, new Date(Date.now() - 14 * 86400_000))))
      .orderBy(desc(news.viewCount))
      .limit(limit);
    return rows.map(mapCard);
  },

  async bySlug(slug: string): Promise<NewsDetail | null> {
    const rows = await baseNewsQuery().where(and(eq(news.slug, slug), publishedCond())).limit(1);
    const r = rows[0];
    if (!r) return null;
    const contentRows = await db
      .select({ content: news.content, subtitle: news.subtitle })
      .from(news)
      .where(eq(news.id, r.id))
      .limit(1);
    const tagRows = await db
      .select({ slug: newsTags.slug, name: newsTags.name })
      .from(newsTagLinks)
      .innerJoin(newsTags, eq(newsTags.id, newsTagLinks.tagId))
      .where(eq(newsTagLinks.newsId, r.id));
    return {
      ...mapCard(r),
      subtitle: contentRows[0]?.subtitle ?? null,
      content: contentRows[0]?.content ?? "",
      tags: tagRows,
    };
  },

  async related(newsId: number, categoryId: number, limit = 4): Promise<NewsCard[]> {
    const rows = await baseNewsQuery()
      .where(
        and(
          publishedCond(),
          eq(news.categoryId, categoryId),
          sql`${news.id} <> ${newsId}`,
        ),
      )
      .orderBy(desc(news.publishedAt))
      .limit(limit);
    return rows.map(mapCard);
  },

  async incrementViews(newsId: number): Promise<void> {
    await db
      .update(news)
      .set({ viewCount: sql`${news.viewCount} + 1` })
      .where(eq(news.id, newsId));
  },

  async categories() {
    return db
      .select({ slug: newsCategories.slug, name: newsCategories.name })
      .from(newsCategories)
      .orderBy(newsCategories.id);
  },

  /* ── comments ─────────────────────────────────────────── */

  async comments(newsId: number, limit = 50) {
    return db
      .select({
        id: comments.id,
        content: comments.content,
        createdAt: comments.createdAt,
        status: comments.status,
        likeCount: comments.likeCount,
        parentId: comments.parentId,
        userId: users.id,
        username: users.username,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
      })
      .from(comments)
      .innerJoin(users, eq(users.id, comments.userId))
      .where(and(eq(comments.newsId, newsId), eq(comments.status, "visible")))
      .orderBy(desc(comments.createdAt))
      .limit(limit);
  },

  async insertComment(data: { newsId: number; userId: number; content: string; parentId?: number }) {
    const [row] = await db
      .insert(comments)
      .values({
        newsId: data.newsId,
        userId: data.userId,
        content: data.content,
        parentId: data.parentId ?? null,
      })
      .returning({ id: comments.id });
    return row!.id;
  },

  async pendingCount(): Promise<number> {
    const countRows = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(comments)
      .where(eq(comments.status, "pending"));
    return countRows[0]?.count ?? 0;
  },

  async commentById(id: number) {
    const rows = await db.select().from(comments).where(eq(comments.id, id)).limit(1);
    return rows[0] ?? null;
  },
};
