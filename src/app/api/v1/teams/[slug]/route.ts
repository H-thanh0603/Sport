import { NextRequest } from "next/server";
import { route, ok } from "@/server/http/api";
import { teamsService } from "@/server/services";
import { matchesRepo } from "@/server/repositories/matches.repo";

type Ctx = { params: Promise<{ slug: string }> };

/** GET /api/v1/teams/:idOrSlug — team + squad + last matches. */
export const GET = route(async (_req: NextRequest, ctx: Ctx) => {
  const { slug } = await ctx.params;
  const team = await teamsService.bySlugOrId(slug);
  const [squad, recent] = await Promise.all([
    teamsService.squad(team.id),
    matchesRepo.byTeamIds([team.id], { status: ["finished", "live", "scheduled"] }, 10),
  ]);
  return ok({ team, squad, recent });
});
