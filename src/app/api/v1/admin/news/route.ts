import { NextRequest } from "next/server";
import { z } from "zod";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { news, newsCategories, users } from "@/db/schema";
import { route, ok, fail, jsonBody, parsePagination, paginationMeta } from "@/server/http/api";
import { adminGuard, audit, sameOriginGuard } from "../helpers";
import { invalidate } from "@/server/cache";

/** GET /api/v1/admin/news — all statuses. */
export const GET = route(async (req: NextRequest) => {
  const { denied } = await adminGuard("moderator");
  if (denied) return denied;

  const url = req.nextUrl;
  const status = url.searchParams.get("status");
  const { page, perPage } = parsePagination(url);
  const where = status ? eq(news.status, status as "published") : undefined;
  const items = await db
    .select({
      id: news.id,
      slug: news.slug,
      title: news.title,
      status: news.status,
      viewCount: news.viewCount,
      isBreaking: news.isBreaking,
      isFeatured: news.isFeatured,
      publishedAt: news.publishedAt,
      category: newsCategories.name,
      author: users.displayName,
    })
    .from(news)
    .innerJoin(newsCategories, eq(newsCategories.id, news.categoryId))
    .leftJoin(users, eq(users.id, news.authorId))
    .where(where)
    .orderBy(desc(news.updatedAt))
    .limit(perPage)
    .offset((page - 1) * perPage);
  const [countRow] = await db.select({ count: sql<number>`count(*)::int` }).from(news).where(where);
  return ok(items, paginationMeta(page, perPage, countRow?.count ?? 0));
});

const createSchema = z.object({
  title: z.string().min(5).max(250),
  excerpt: z.string().min(10).max(320),
  content: z.string().min(20),
  categorySlug: z.string().min(1),
  subtitle: z.string().max(300).optional(),
  isBreaking: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
});

const patchSchema = z.object({
  newsId: z.coerce.number().int().positive(),
  status: z.enum(["draft", "published", "archived"]).optional(),
  isBreaking: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  title: z.string().min(5).max(250).optional(),
});

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 180);
}

/** POST /api/v1/admin/news — create or patch (newsId optional → create). */
export const POST = route(async (req: NextRequest) => {
  const csrf = sameOriginGuard(req);
  if (csrf) return csrf;
  const { user: admin, denied } = await adminGuard("moderator");
  if (denied || !admin) return denied;

  const body = await jsonBody(req).catch(() => null);
  const hasId = !!(body as { newsId?: number } | null)?.newsId;

  if (!hasId) {
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return fail(400, "VALIDATION_ERROR", "Dữ liệu không hợp lệ");
    const [cat] = await db
      .select({ id: newsCategories.id })
      .from(newsCategories)
      .where(eq(newsCategories.slug, parsed.data.categorySlug))
      .limit(1);
    if (!cat) return fail(400, "CATEGORY_NOT_FOUND", "Chuyên mục không tồn tại");
    const slug = `${slugify(parsed.data.title)}-${Date.now().toString(36)}`;
    const [row] = await db
      .insert(news)
      .values({
        slug,
        title: parsed.data.title,
        subtitle: parsed.data.subtitle,
        excerpt: parsed.data.excerpt,
        content: parsed.data.content,
        categoryId: cat.id,
        authorId: admin.id,
        status: "published",
        isBreaking: parsed.data.isBreaking ?? false,
        isFeatured: parsed.data.isFeatured ?? false,
        readingMinutes: Math.max(1, Math.round(parsed.data.content.split(/\s+/).length / 200)),
        publishedAt: new Date(),
      })
      .returning({ id: news.id, slug: news.slug });
    await invalidate("v1:news:");
    await audit(admin.id, "news-create", "news", row!.id, { slug });
    return ok({ id: row!.id, slug: row!.slug });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return fail(400, "VALIDATION_ERROR", "Dữ liệu không hợp lệ");
  const { newsId, status, isBreaking, isFeatured, title } = parsed.data;
  const set: Partial<typeof news.$inferInsert> & { updatedAt: Date } = { updatedAt: new Date() };
  if (status) {
    set.status = status;
    if (status === "published") set.publishedAt = new Date();
  }
  if (isBreaking !== undefined) set.isBreaking = isBreaking;
  if (isFeatured !== undefined) set.isFeatured = isFeatured;
  if (title) set.title = title;
  await db.update(news).set(set).where(eq(news.id, newsId));
  await invalidate("v1:news:");
  await audit(admin.id, "news-edit", "news", newsId, parsed.data);
  return ok({ newsId, updated: true });
});

/** DELETE /api/v1/admin/news?newsId= — archive (soft delete). */
export const DELETE = route(async (req: NextRequest) => {
  const csrf = sameOriginGuard(req);
  if (csrf) return csrf;
  const { user: admin, denied } = await adminGuard("moderator");
  if (denied || !admin) return denied;
  const newsId = Number(req.nextUrl.searchParams.get("newsId"));
  if (!Number.isInteger(newsId)) return fail(400, "VALIDATION_ERROR", "newsId không hợp lệ");
  await db.update(news).set({ status: "archived", updatedAt: new Date() }).where(eq(news.id, newsId));
  await invalidate("v1:news:");
  await audit(admin.id, "news-archive", "news", newsId);
  return ok({ newsId, archived: true });
});
