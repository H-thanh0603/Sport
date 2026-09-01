import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { reports } from "@/db/schema";
import { route, created, fail, jsonBody, isSameOrigin } from "@/server/http/api";
import { rateLimit } from "@/server/cache/rate-limit";
import { getSessionUser } from "@/server/auth/session";

const schema = z.object({
  targetType: z.enum(["comment", "news"]),
  targetId: z.coerce.number().int().positive(),
  reason: z.string().trim().min(3).max(500),
});

export const POST = route(async (req: NextRequest) => {
  if (!isSameOrigin(req)) return fail(403, "CSRF", "Cross-origin request rejected");
  const user = await getSessionUser();
  if (!user) return fail(401, "UNAUTHORIZED", "Chưa đăng nhập");
  const rl = await rateLimit("report", `${user.id}`, 10, 3600);
  if (!rl.allowed) return fail(429, "RATE_LIMITED", "Quá nhiều báo cáo");

  const parsed = schema.safeParse(await jsonBody(req).catch(() => null));
  if (!parsed.success) return fail(400, "VALIDATION_ERROR", "Dữ liệu không hợp lệ");
  const [row] = await db
    .insert(reports)
    .values({
      reporterId: user.id,
      targetType: parsed.data.targetType,
      targetId: parsed.data.targetId,
      reason: parsed.data.reason,
    })
    .returning({ id: reports.id });
  return created({ id: row!.id });
});
