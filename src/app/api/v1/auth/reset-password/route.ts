import { NextRequest } from "next/server";
import { z } from "zod";
import { route, ok, fail, clientIp, isSameOrigin, jsonBody } from "@/server/http/api";
import { rateLimit } from "@/server/cache/rate-limit";
import { consumeEmailToken } from "@/server/auth/email";
import { hashPassword } from "@/server/auth/password";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revokeUserSessions } from "@/server/auth/session";

const schema = z.object({
  token: z.string().min(20).max(128),
  password: z.string().min(8).max(128).regex(/[a-zA-Z]/).regex(/[0-9]/),
});

export const POST = route(async (req: NextRequest) => {
  if (!isSameOrigin(req)) return fail(403, "CSRF", "Cross-origin request rejected");
  const rl = await rateLimit("auth:reset", clientIp(req), 10, 3600);
  if (!rl.allowed) return fail(429, "RATE_LIMITED", "Quá nhiều yêu cầu");

  const parsed = schema.safeParse(await jsonBody(req).catch(() => null));
  if (!parsed.success) {
    return fail(400, "VALIDATION_ERROR", "Dữ liệu không hợp lệ", parsed.error.flatten().fieldErrors);
  }
  const userId = await consumeEmailToken(parsed.data.token, "reset_password");
  if (!userId) return fail(400, "INVALID_TOKEN", "Liên kết không hợp lệ hoặc đã hết hạn");

  await db
    .update(users)
    .set({ passwordHash: await hashPassword(parsed.data.password), updatedAt: new Date() })
    .where(eq(users.id, userId));
  await revokeUserSessions(userId); // security: kill all sessions after reset
  return ok({ reset: true });
});
