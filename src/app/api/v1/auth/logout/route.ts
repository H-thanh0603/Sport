import { route, ok, isSameOrigin, fail } from "@/server/http/api";
import { destroySession } from "@/server/auth/session";
import { NextRequest } from "next/server";

export const POST = route(async (req: NextRequest) => {
  if (!isSameOrigin(req)) return fail(403, "CSRF", "Cross-origin request rejected");
  await destroySession();
  return ok({ loggedOut: true });
});
