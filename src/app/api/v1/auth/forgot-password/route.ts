import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { route, ok, fail, clientIp, isSameOrigin, jsonBody } from "@/server/http/api";
import { rateLimit } from "@/server/cache/rate-limit";
import { issueEmailToken } from "@/server/auth/email";

const schema = z.object({ email: z.string().email().max(255) });

export const POST = route(async (req: NextRequest) => {
  if (!isSameOrigin(req)) return fail(403, "CSRF", "Cross-origin request rejected");
  const rl = await rateLimit("auth:forgot", clientIp(req), 5, 3600);
  if (!rl.allowed) return fail(429, "RATE_LIMITED", "Quá nhiều yêu cầu. Thử lại sau.");

  const parsed = schema.safeParse(await jsonBody(req).catch(() => null));
  if (!parsed.success) {
    return fail(400, "VALIDATION_ERROR", "Email không hợp lệ");
  }
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, parsed.data.email))
    .limit(1);

  // luôn trả OK — không lộ email tồn tại hay không (enumeration defense)
  if (user) {
    await issueEmailToken(user.id, "reset_password", parsed.data.email);
  }
  return ok({ sent: true });
});
