import { NextRequest } from "next/server";
import { z } from "zod";
import { route, ok, created, fail, jsonBody, isSameOrigin } from "@/server/http/api";
import { getSessionUser } from "@/server/auth/session";
import { favoritesService } from "@/server/services";

export const GET = route(async () => {
  const user = await getSessionUser();
  if (!user) return fail(401, "UNAUTHORIZED", "Chưa đăng nhập");
  const [favorites, hydrated] = await Promise.all([
    favoritesService.list(user.id),
    favoritesService.hydrated(user.id),
  ]);
  return ok({ favorites, hydrated });
});

const schema = z.object({
  type: z.enum(["team", "player", "league"]),
  targetId: z.coerce.number().int().positive(),
});

/** POST /api/v1/favorites — add */
export const POST = route(async (req: NextRequest) => {
  if (!isSameOrigin(req)) return fail(403, "CSRF", "Cross-origin request rejected");
  const user = await getSessionUser();
  if (!user) return fail(401, "UNAUTHORIZED", "Chưa đăng nhập");
  const parsed = schema.safeParse(await jsonBody(req).catch(() => null));
  if (!parsed.success) return fail(400, "VALIDATION_ERROR", "Dữ liệu không hợp lệ");
  const { type, targetId } = parsed.data;
  await favoritesService.toggle(user.id, type, targetId);
  const exists = await favoritesService.exists(user.id, type, targetId);
  return created({ type, targetId, favorited: exists });
});

/** DELETE /api/v1/favorites?type=team&targetId=1 — remove */
export const DELETE = route(async (req: NextRequest) => {
  if (!isSameOrigin(req)) return fail(403, "CSRF", "Cross-origin request rejected");
  const user = await getSessionUser();
  if (!user) return fail(401, "UNAUTHORIZED", "Chưa đăng nhập");
  const type = req.nextUrl.searchParams.get("type");
  const targetId = Number(req.nextUrl.searchParams.get("targetId"));
  if (type !== "team" && type !== "player" && type !== "league") {
    return fail(400, "VALIDATION_ERROR", "type không hợp lệ");
  }
  if (!Number.isInteger(targetId) || targetId <= 0) {
    return fail(400, "VALIDATION_ERROR", "targetId không hợp lệ");
  }
  await favoritesService.toggle(user.id, type, targetId); // toggle removes since exists
  const exists = await favoritesService.exists(user.id, type, targetId);
  return ok({ type, targetId, favorited: exists });
});
