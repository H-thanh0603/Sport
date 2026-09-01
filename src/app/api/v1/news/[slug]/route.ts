import { NextRequest } from "next/server";
import { route, ok } from "@/server/http/api";
import { newsService } from "@/server/services";

type Ctx = { params: Promise<{ slug: string }> };

export const GET = route(async (_req: NextRequest, ctx: Ctx) => {
  const { slug } = await ctx.params;
  const article = await newsService.bySlug(slug);
  const related = await newsService.related(slug);
  void newsService.recordView; // view increment handled by page render (avoid double count on API)
  return ok({ article, related });
});
