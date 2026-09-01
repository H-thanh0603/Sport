import { NextRequest } from "next/server";
import { route, ok } from "@/server/http/api";
import { playersService } from "@/server/services";

type Ctx = { params: Promise<{ slug: string }> };

export const GET = route(async (_req: NextRequest, ctx: Ctx) => {
  const { slug } = await ctx.params;
  const player = await playersService.bySlug(slug);
  const stats = await playersService.stats(player.id);
  return ok({ player, stats });
});
