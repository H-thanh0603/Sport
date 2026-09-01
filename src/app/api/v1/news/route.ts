import { NextRequest } from "next/server";
import { route, ok, parsePagination, paginationMeta } from "@/server/http/api";
import { newsService } from "@/server/services";

export const GET = route(async (req: NextRequest) => {
  const url = req.nextUrl;
  const { page, perPage } = parsePagination(url, { page: 1, perPage: 12, maxPerPage: 30 });
  const result = await newsService.list({
    category: url.searchParams.get("category") ?? undefined,
    featured: url.searchParams.get("featured") === "true",
    breaking: url.searchParams.get("breaking") === "true",
    sort: (url.searchParams.get("sort") as "latest" | "views") ?? "latest",
    page,
    perPage,
  });
  return ok(result.items, paginationMeta(page, perPage, result.meta.total));
});
