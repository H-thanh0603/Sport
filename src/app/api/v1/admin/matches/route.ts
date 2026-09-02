import { NextRequest } from "next/server";
import { z } from "zod";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { leagues, matches } from "@/db/schema";
import { route, ok, fail, jsonBody, parsePagination, paginationMeta } from "@/server/http/api";
import { adminGuard, audit, sameOriginGuard } from "../helpers";
import { invalidate } from "@/server/cache";

/** GET /api/v1/admin/matches — list with filters. */
export const GET = route(async (req: NextRequest) => {
  const { denied } = await adminGuard("moderator");
  if (denied) return denied;

  const url = req.nextUrl;
  const status = url.searchParams.get("status");
  const q = url.searchParams.get("q");
  const { page, perPage } = parsePagination(url);

  const conds = [];
  if (status) conds.push(eq(matches.status, status as "scheduled"));
  const where = conds.length > 0 ? and(...conds) : undefined;

  const items = await db
    .select({
      id: matches.id,
      startTime: matches.startTime,
      status: matches.status,
      homeScore: matches.homeScore,
      awayScore: matches.awayScore,
      minute: matches.minute,
      homeTeam: sql<string>`ht.name`,
      awayTeam: sql<string>`at2.name`,
      league: leagues.name,
    })
    .from(matches)
    .innerJoin(sql`teams as ht`, sql`ht.id = ${matches.homeTeamId}`)
    .innerJoin(sql`teams as at2`, sql`at2.id = ${matches.awayTeamId}`)
    .innerJoin(leagues, eq(leagues.id, matches.leagueId))
    .where(where)
    .orderBy(desc(matches.startTime))
    .limit(perPage)
    .offset((page - 1) * perPage);
  void q;
  const [countRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(matches)
    .where(where);
  return ok(items, paginationMeta(page, perPage, countRow?.count ?? 0));
});

const patchSchema = z.object({
  matchId: z.coerce.number().int().positive(),
  startTime: z.string().datetime().optional(),
  status: z.enum(["scheduled", "live", "halftime", "finished", "postponed", "cancelled"]).optional(),
  homeScore: z.coerce.number().int().min(0).nullable().optional(),
  awayScore: z.coerce.number().int().min(0).nullable().optional(),
  postponedReason: z.string().max(255).optional(),
});

/** POST /api/v1/admin/matches — edit match (time/status/score/postpone). */
export const POST = route(async (req: NextRequest) => {
  const csrf = sameOriginGuard(req);
  if (csrf) return csrf;
  const { user: admin, denied } = await adminGuard("moderator");
  if (denied || !admin) return denied;

  const parsed = patchSchema.safeParse(await jsonBody(req).catch(() => null));
  if (!parsed.success) return fail(400, "VALIDATION_ERROR", "Dữ liệu không hợp lệ");
  const { matchId, ...patch } = parsed.data;
  if (Object.keys(patch).length === 0) return fail(400, "EMPTY_PATCH", "Không có thay đổi nào");

  const set: Partial<typeof matches.$inferInsert> = { lastSyncedAt: new Date() };
  if (patch.startTime) set.startTime = new Date(patch.startTime);
  if (patch.status) set.status = patch.status;
  if (patch.homeScore !== undefined) set.homeScore = patch.homeScore;
  if (patch.awayScore !== undefined) set.awayScore = patch.awayScore;
  if (patch.postponedReason !== undefined) set.postponedReason = patch.postponedReason;

  await db.update(matches).set(set).where(eq(matches.id, matchId));
  await invalidate(`v1:match:detail:${matchId}`);
  await invalidate("v1:live:");
  await invalidate("v1:schedule:");
  await audit(admin.id, "match-edit", "match", matchId, patch);
  return ok({ matchId, updated: true });
});
