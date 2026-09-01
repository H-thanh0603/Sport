import { NextRequest } from "next/server";
import { route, ok } from "@/server/http/api";
import { matchesService } from "@/server/services/matches.service";
import { teamsRepo } from "@/server/repositories/teams.repo";
import { notFound } from "@/server/http/api";
import { leaguesService } from "@/server/services";

type Ctx = { params: Promise<{ slug: string }> };

/** GET /api/v1/leagues/:slug — league + teams + recent matches (overview bundle) */
export const GET = route(async (_req: NextRequest, ctx: Ctx) => {
  const { slug } = await ctx.params;
  const league = await leaguesService.bySlug(slug);
  const teams = await leaguesService.teams(slug);
  const matches = await matchesService.listMatches({ league: slug, perPage: 10 });
  if (!league) throw notFound("league");
  void teamsRepo;
  return ok({ league, teams, matches: matches.items, meta: matches.meta });
});
