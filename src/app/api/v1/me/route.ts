import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { route, ok, fail, jsonBody, isSameOrigin } from "@/server/http/api";
import { getSessionUser } from "@/server/auth/session";

export const GET = route(async () => {
  const user = await getSessionUser();
  if (!user) return fail(401, "UNAUTHORIZED", "Chưa đăng nhập");
  return ok(user);
});

const patchSchema = z.object({
  displayName: z.string().min(2).max(64).optional(),
  timezone: z.string().max(64).optional(),
  avatarUrl: z.string().url().max(500).optional(),
});

export const POST = route(async (req: NextRequest) => {
  if (!isSameOrigin(req)) return fail(403, "CSRF", "Cross-origin request rejected");
  const user = await getSessionUser();
  if (!user) return fail(401, "UNAUTHORIZED", "Chưa đăng nhập");
  const parsed = patchSchema.safeParse(await jsonBody(req).catch(() => null));
  if (!parsed.success) {
    return fail(400, "VALIDATION_ERROR", "Dữ liệu không hợp lệ", parsed.error.flatten().fieldErrors);
  }
  await db
    .update(users)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(users.id, user.id));
  return ok({ updated: true });
});
