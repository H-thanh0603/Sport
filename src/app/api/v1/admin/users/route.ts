import { NextRequest } from "next/server";
import { z } from "zod";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { route, ok, fail, jsonBody, parsePagination, paginationMeta } from "@/server/http/api";
import { adminGuard, audit, sameOriginGuard } from "../helpers";
import { revokeUserSessions } from "@/server/auth/session";
import { hashPassword } from "@/server/auth/password";

/** GET /api/v1/admin/users — list with search + pagination. */
export const GET = route(async (req: NextRequest) => {
  const { denied } = await adminGuard("moderator");
  if (denied) return denied;

  const url = req.nextUrl;
  const q = url.searchParams.get("q");
  const { page, perPage } = parsePagination(url);
  const where = q
    ? sql`${users.username} ILIKE ${`%${q}%`} OR ${users.email} ILIKE ${`%${q}%`} OR ${users.displayName} ILIKE ${`%${q}%`}`
    : undefined;
  const items = await db
    .select({
      id: users.id,
      email: users.email,
      username: users.username,
      displayName: users.displayName,
      role: users.role,
      status: users.status,
      emailVerifiedAt: users.emailVerifiedAt,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(where)
    .orderBy(desc(users.createdAt))
    .limit(perPage)
    .offset((page - 1) * perPage);
  const [countRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users)
    .where(where);
  return ok(items, paginationMeta(page, perPage, countRow?.count ?? 0));
});

const patchSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("ban"), userId: z.coerce.number().int().positive() }),
  z.object({ action: z.literal("unban"), userId: z.coerce.number().int().positive() }),
  z.object({
    action: z.literal("role"),
    userId: z.coerce.number().int().positive(),
    role: z.enum(["user", "moderator", "admin"]),
  }),
  z.object({
    action: z.literal("reset-password"),
    userId: z.coerce.number().int().positive(),
    password: z.string().min(8).max(128).regex(/[a-zA-Z]/).regex(/[0-9]/),
  }),
]);

/** POST /api/v1/admin/users — ban/unban/role/reset-password. Admin-only for role. */
export const POST = route(async (req: NextRequest) => {
  const csrf = sameOriginGuard(req);
  if (csrf) return csrf;
  const { user: admin, denied } = await adminGuard("moderator");
  if (denied || !admin) return denied;

  const parsed = patchSchema.safeParse(await jsonBody(req).catch(() => null));
  if (!parsed.success) return fail(400, "VALIDATION_ERROR", "Dữ liệu không hợp lệ");
  const { action } = parsed.data;

  if (action === "ban" || action === "unban") {
    const { userId } = parsed.data;
    if (userId === admin.id) return fail(400, "SELF_BAN", "Không thể tự khóa chính mình");
    await db
      .update(users)
      .set({ status: action === "ban" ? "banned" : "active" })
      .where(eq(users.id, userId));
    if (action === "ban") await revokeUserSessions(userId);
    await audit(admin.id, action, "user", userId);
    return ok({ userId, status: action === "ban" ? "banned" : "active" });
  }

  if (action === "role") {
    const { userId, role } = parsed.data;
    if (admin.role !== "admin") {
      return fail(403, "FORBIDDEN", "Chỉ admin mới đổi vai trò");
    }
    if (userId === admin.id) return fail(400, "SELF_ROLE", "Không thể đổi vai trò chính mình");
    await db.update(users).set({ role }).where(eq(users.id, userId));
    await audit(admin.id, "role-change", "user", userId, { role });
    return ok({ userId, role });
  }

  const { userId, password } = parsed.data;
  await db
    .update(users)
    .set({ passwordHash: await hashPassword(password), updatedAt: new Date() })
    .where(eq(users.id, userId));
  await revokeUserSessions(userId);
  await audit(admin.id, "reset-password", "user", userId);
  return ok({ userId, reset: true });
});
