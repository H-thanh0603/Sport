import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { bookmarks } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { route, ok, created, fail, jsonBody, isSameOrigin } from "@/server/http/api";
import { getSessionUser } from "@/server/auth/session";

const schema = z.object({ newsId: z.coerce.number().int().positive() });

export const POST = route(async (req: NextRequest) => {
  if (!isSameOrigin(req)) return fail(403, "CSRF", "Cross-origin request rejected");
  const user = await getSessionUser();
  if (!user) return fail(401, "UNAUTHORIZED", "Chưa đăng nhập");
  const parsed = schema.safeParse(await jsonBody(req).catch(() => null));
  if (!parsed.success) return fail(400, "VALIDATION_ERROR", "newsId không hợp lệ");
  await db
    .insert(bookmarks)
    .values({ userId: user.id, newsId: parsed.data.newsId })
    .onConflictDoNothing();
  return created({ bookmarked: true });
});

export const DELETE = route(async (req: NextRequest) => {
  if (!isSameOrigin(req)) return fail(403, "CSRF", "Cross-origin request rejected");
  const user = await getSessionUser();
  if (!user) return fail(401, "UNAUTHORIZED", "Chưa đăng nhập");
  const newsId = Number(req.nextUrl.searchParams.get("newsId"));
  if (!Number.isInteger(newsId) || newsId <= 0) {
    return fail(400, "VALIDATION_ERROR", "newsId không hợp lệ");
  }
  await db
    .delete(bookmarks)
    .where(and(eq(bookmarks.userId, user.id), eq(bookmarks.newsId, newsId)));
  return ok({ bookmarked: false });
});
