import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, or } from "drizzle-orm";
import { route, ok, fail, clientIp, isSameOrigin, jsonBody } from "@/server/http/api";
import { rateLimit } from "@/server/cache/rate-limit";
import { verifyPassword } from "@/server/auth/password";
import { createSession } from "@/server/auth/session";

const schema = z.object({
  identifier: z.string().min(3).max(255), // email or username
  password: z.string().min(1).max(128),
});

export const POST = route(async (req: NextRequest) => {
  if (!isSameOrigin(req)) return fail(403, "CSRF", "Cross-origin request rejected");
  const ip = clientIp(req);
  const rl = await rateLimit("auth:login", ip, 10, 600);
  if (!rl.allowed) {
    return fail(429, "RATE_LIMITED", "Quá nhiều lần thử. Thử lại sau ít phút.", { resetSec: rl.resetSec });
  }

  const parsed = schema.safeParse(await jsonBody(req).catch(() => null));
  if (!parsed.success) {
    return fail(400, "VALIDATION_ERROR", "Dữ liệu không hợp lệ", parsed.error.flatten().fieldErrors);
  }

  const [user] = await db
    .select({
      id: users.id,
      passwordHash: users.passwordHash,
      status: users.status,
      email: users.email,
    })
    .from(users)
    .where(or(eq(users.email, parsed.data.identifier), eq(users.username, parsed.data.identifier)))
    .limit(1);

  // constant-ish response regardless of which factor failed
  if (!user || !(await verifyPassword(user.passwordHash, parsed.data.password))) {
    return fail(401, "INVALID_CREDENTIALS", "Email/tên đăng nhập hoặc mật khẩu không đúng");
  }
  if (user.status === "banned") {
    return fail(403, "BANNED", "Tài khoản đã bị khóa");
  }

  await createSession(user.id);
  return ok({ id: user.id, email: user.email });
});
