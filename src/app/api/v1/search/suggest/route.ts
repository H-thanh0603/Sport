import { NextRequest } from "next/server";
import { route, ok } from "@/server/http/api";
import { searchService } from "@/server/services";
import { z } from "zod";

const schema = z.object({ q: z.string().trim().min(2).max(64) });

export const GET = route(async (req: NextRequest) => {
  const { q } = schema.parse({ q: req.nextUrl.searchParams.get("q") ?? "" });
  return ok(await searchService.suggest(q));
});
