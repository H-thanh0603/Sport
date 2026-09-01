import { NextRequest } from "next/server";
import { z } from "zod";
import { route, ok, created, fail, jsonBody, isSameOrigin, parsePagination, paginationMeta } from "@/server/http/api";
import { getSessionUser } from "@/server/auth/session";
import { newsRepo } from "@/server/repositories/news.repo";
import { clientIp } from "@/server/http/api";
import { rateLimit } from "@/server/cache/rate-limit";

/** GET /api/v1/comments?newsId=1 */
export const GET = route(async (req: NextRequest) => {
  const newsId = Number(req.nextUrl.searchParams.get("newsId"));
  if (!Number.isInteger(newsId) || newsId <= 0) {
    return fail(400, "VALIDATION_ERROR", "newsId không hợp lệ");
  }
  const { page, perPage } = parsePagination(req.nextUrl, { page: 1, perPage: 20, maxPerPage: 50 });
  const items = await newsRepo.comments(newsId, perPage);
  return ok(items, paginationMeta(page, perPage, items.length));
});

const postSchema = z.object({
  newsId: z.coerce.number().int().positive(),
  content: z.string().trim().min(2).max(2000),
  parentId: z.coerce.number().int().positive().optional(),
});

const SPAM_PATTERNS = [/https?:\/\/\S+/gi, /(.)\1{6,}/, /\b(viagra|casino|loan|crypto airdrop)\b/i];

export const POST = route(async (req: NextRequest) => {
  if (!isSameOrigin(req)) return fail(403, "CSRF", "Cross-origin request rejected");
  const user = await getSessionUser();
  if (!user) return fail(401, "UNAUTHORIZED", "Chưa đăng nhập");
  if (!user.emailVerified) {
    return fail(403, "EMAIL_NOT_VERIFIED", "Xác thực email trước khi bình luận");
  }
  const rl = await rateLimit("comment", `${user.id}:${clientIp(req)}`, 10, 300);
  if (!rl.allowed) return fail(429, "RATE_LIMITED", "Bình luận quá nhanh. Thử lại sau.");

  const parsed = postSchema.safeParse(await jsonBody(req).catch(() => null));
  if (!parsed.success) return fail(400, "VALIDATION_ERROR", "Dữ liệu không hợp lệ");

  // spam heuristic: >2 links or repeated chars or spam words → pending moderation
  const spammy = SPAM_PATTERNS.some((re) => (parsed.data.content.match(re) ?? []).length > 0);
  const id = await newsRepo.insertComment({
    newsId: parsed.data.newsId,
    userId: user.id,
    content: parsed.data.content,
    parentId: parsed.data.parentId,
  });
  return created({ id, pendingModeration: spammy });
});
