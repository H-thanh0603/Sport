import { NextRequest } from "next/server";
import { route, ok } from "@/server/http/api";
import { leaguesService } from "@/server/services";

export const GET = route(async (req: NextRequest) => {
  const slug = req.nextUrl.searchParams.get("league");
  if (!slug) {
    return ok([]);
    // spec: /api/v1/standings?league=slug
  }
  return ok(await leaguesService.standings(slug));
});
