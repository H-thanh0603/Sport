import { NextRequest } from "next/server";
import { z } from "zod";
import { route, ok, fail, jsonBody, isSameOrigin } from "@/server/http/api";
import { getSessionUser } from "@/server/auth/session";
import { notificationsService } from "@/server/services";

const schema = z.object({ ids: z.array(z.coerce.number().int().positive()).max(200).optional() });

/** POST /api/v1/notifications/read — mark read (all when ids omitted) */
export const POST = route(async (req: NextRequest) => {
  if (!isSameOrigin(req)) return fail(403, "CSRF", "Cross-origin request rejected");
  const user = await getSessionUser();
  if (!user) return fail(401, "UNAUTHORIZED", "Chưa đăng nhập");
  const parsed = schema.safeParse(await jsonBody(req).catch(() => ({})));
  await notificationsService.markRead(user.id, parsed.success ? parsed.data.ids : undefined);
  return ok({ read: true });
});
