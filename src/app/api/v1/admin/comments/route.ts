import { NextRequest } from "next/server";
import { z } from "zod";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { comments, users, news } from "@/db/schema";
import { route, ok, fail, jsonBody, parsePagination, paginationMeta } from "@/server/http/api";
import { adminGuard, audit, sameOriginGuard } from "../helpers";

/** GET /api/v1/admin/comments?status=pending — moderation queue. */
export const GET = route(async (req: NextRequest) => {
  const { denied } = await adminGuard("moderator");
  if (denied) return denied;

  const url = req.nextUrl;
  const status = (url.searchParams.get("status") ?? "pending") as "pending" | "visible" | "hidden" | "deleted";
  const { page, perPage } = parsePagination(url);
  const items = await db
    .select({
      id: comments.id,
      content: comments.content,
      status: comments.status,
      createdAt: comments.createdAt,
      newsTitle: news.title,
      newsSlug: news.slug,
      userId: users.id,
      username: users.username,
      displayName: users.displayName,
    })
    .from(comments)
    .innerJoin(users, eq(users.id, comments.userId))
    .innerJoin(news, eq(news.id, comments.newsId))
    .where(eq(comments.status, status))
    .orderBy(desc(comments.createdAt))
    .limit(perPage)
    .offset((page - 1) * perPage);
  const [countRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(comments)
    .where(eq(comments.status, status));
  return ok(items, paginationMeta(page, perPage, countRow?.count ?? 0));
});

const actionSchema = z.object({
  commentId: z.coerce.number().int().positive(),
  action: z.enum(["approve", "hide", "delete"]),
});

/** POST /api/v1/admin/comments — moderate: approve/hide/delete. */
export const POST = route(async (req: NextRequest) => {
  const csrf = sameOriginGuard(req);
  if (csrf) return csrf;
  const { user: admin, denied } = await adminGuard("moderator");
  if (denied || !admin) return denied;

  const parsed = actionSchema.safeParse(await jsonBody(req).catch(() => null));
  if (!parsed.success) return fail(400, "VALIDATION_ERROR", "Dữ liệu không hợp lệ");
  const { commentId, action } = parsed.data;
  const status = action === "approve" ? "visible" : action === "hide" ? "hidden" : "deleted";
  await db.update(comments).set({ status }).where(eq(comments.id, commentId));
  await audit(admin.id, `comment-${action}`, "comment", commentId);
  return ok({ commentId, status });
});

