import { NextRequest } from "next/server";
import { route, ok, parsePagination, paginationMeta } from "@/server/http/api";
import { teamsRepo } from "@/server/repositories/teams.repo";
import { teamsService } from "@/server/services";

export const GET = route(async (req: NextRequest) => {
  const url = req.nextUrl;
  const q = url.searchParams.get("q");
  const leagueId = url.searchParams.get("leagueId");
  const { page, perPage } = parsePagination(url);
  if (q) {
    const items = await teamsRepo.search(q, perPage);
    return ok(items, paginationMeta(page, perPage, items.length));
  }
  if (leagueId) {
    const items = await teamsRepo.byLeague(Number(leagueId));
    return ok(items, paginationMeta(page, perPage, items.length));
  }
  // default: nothing without filter (avoid full scan)
  return ok([], paginationMeta(page, perPage, 0));
});

void teamsService;
