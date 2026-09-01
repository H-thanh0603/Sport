import { route, ok, fail } from "@/server/http/api";
import { getSessionUser } from "@/server/auth/session";
import { notificationsService } from "@/server/services";

export const GET = route(async () => {
  const user = await getSessionUser();
  if (!user) return fail(401, "UNAUTHORIZED", "Chưa đăng nhập");
  return ok(await notificationsService.list(user.id));
});
