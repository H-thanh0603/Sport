import { NextRequest } from "next/server";
import { route, ok } from "@/server/http/api";
import { leaguesService } from "@/server/services";

export const GET = route(async (req: NextRequest) => {
  const sport = req.nextUrl.searchParams.get("sport") ?? undefined;
  const popular = req.nextUrl.searchParams.get("popular");
  if (popular === "true") return ok(await leaguesService.popular());
  return ok(await leaguesService.list(sport));
});
