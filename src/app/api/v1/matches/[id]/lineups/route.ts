import { NextRequest } from "next/server";
import { route, ok, notFound, ApiError } from "@/server/http/api";
import { matchesService } from "@/server/services/matches.service";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route(async (_req: NextRequest, ctx: Ctx) => {
  const { id } = await ctx.params;
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId <= 0) {
    throw new ApiError(400, "INVALID_ID", "Match id must be a positive integer");
  }
  const d = await matchesService.getMatchDetail(numId);
  if (!d) throw notFound("match");
  return ok(d.lineups);
});
