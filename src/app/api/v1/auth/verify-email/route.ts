import { NextRequest } from "next/server";
import { z } from "zod";
import { route, ok, fail, clientIp, isSameOrigin, jsonBody } from "@/server/http/api";
import { rateLimit } from "@/server/cache/rate-limit";
import { consumeEmailToken, markEmailVerified } from "@/server/auth/email";

const schema = z.object({ token: z.string().min(20).max(128) });

export const POST = route(async (req: NextRequest) => {
  if (!isSameOrigin(req)) return fail(403, "CSRF", "Cross-origin request rejected");
  const rl = await rateLimit("auth:verify", clientIp(req), 20, 3600);
  if (!rl.allowed) return fail(429, "RATE_LIMITED", "Quá nhiều yêu cầu");

  const parsed = schema.safeParse(await jsonBody(req).catch(() => null));
  if (!parsed.success) return fail(400, "VALIDATION_ERROR", "Token không hợp lệ");
  const userId = await consumeEmailToken(parsed.data.token, "verify_email");
  if (!userId) return fail(400, "INVALID_TOKEN", "Liên kết không hợp lệ hoặc đã hết hạn");
  await markEmailVerified(userId);
  return ok({ verified: true });
});
