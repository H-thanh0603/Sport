import { NextRequest } from "next/server";
import { route, ok } from "@/server/http/api";
import { searchService } from "@/server/services";
import { z } from "zod";

const schema = z.object({
  q: z.string().trim().min(2).max(64),
  limit: z.coerce.number().int().min(1).max(10).optional(),
});

export const GET = route(async (req: NextRequest) => {
  const { q, limit } = schema.parse({
    q: req.nextUrl.searchParams.get("q") ?? "",
    limit: req.nextUrl.searchParams.get("limit") ?? undefined,
  });
  return ok(await searchService.all(q, limit));
});
