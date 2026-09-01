import { NextRequest } from "next/server";
import { route, ok, parsePagination, paginationMeta } from "@/server/http/api";
import { matchesService } from "@/server/services/matches.service";
import type { MatchStatus } from "@/server/services/types";
import { z } from "zod";

const statusValues = z.enum([
  "scheduled",
  "live",
  "halftime",
  "finished",
  "postponed",
  "cancelled",
]);

const querySchema = z.object({
  sport: z.string().max(48).optional(),
  league: z.string().max(96).optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  status: z.union([statusValues, z.array(statusValues)]).optional(),
  teamId: z.coerce.number().int().positive().optional(),
  window: z.enum(["today", "tomorrow", "week"]).optional(),
});

export const GET = route(async (req: NextRequest) => {
  const url = req.nextUrl;
  const q = querySchema.parse({
    sport: url.searchParams.get("sport") ?? undefined,
    league: url.searchParams.get("league") ?? undefined,
    date: url.searchParams.get("date") ?? undefined,
    status: url.searchParams.get("status")
      ? url.searchParams.getAll("status").length > 1
        ? url.searchParams.getAll("status")
        : url.searchParams.get("status")
      : undefined,
    teamId: url.searchParams.get("teamId") ?? undefined,
    window: (url.searchParams.get("window") as "today" | "tomorrow" | "week" | null) ?? undefined,
  });
  const { page, perPage } = parsePagination(url);
  const filter = {
    ...q,
    status: q.status as MatchStatus | MatchStatus[] | undefined,
    page,
    perPage,
  };
  const mode = url.searchParams.get("mode"); // upcoming | results | all
  const result =
    mode === "results"
      ? await matchesService.getMatchResults(filter)
      : mode === "upcoming"
        ? await matchesService.getUpcomingMatches(filter)
        : await matchesService.listMatches(filter);
  return ok(result.items, paginationMeta(page, perPage, result.meta.total));
});
