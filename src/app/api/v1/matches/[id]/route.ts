import { NextRequest } from "next/server";
import { route, ok, notFound, ApiError } from "@/server/http/api";
import { matchesService } from "@/server/services/matches.service";

export const GET = route(async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId <= 0) {
    throw new ApiError(400, "INVALID_ID", "Match id must be a positive integer");
  }
  const detail = await matchesService.getMatchDetail(numId);
  if (!detail) throw notFound("match");
  return ok(detail);
});
