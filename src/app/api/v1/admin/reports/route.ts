import { NextRequest } from "next/server";
import { z } from "zod";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { reports, users, comments } from "@/db/schema";
import { route, ok, fail, jsonBody, parsePagination, paginationMeta } from "@/server/http/api";
import { adminGuard, audit, sameOriginGuard } from "../helpers";

/** GET /api/v1/admin/reports?status=open — moderation queue. */
export const GET = route(async (req: NextRequest) => {
  const { denied } = await adminGuard("moderator");
  if (denied) return denied;

  const url = req.nextUrl;
  const status = (url.searchParams.get("status") ?? "open") as "open" | "resolved" | "dismissed";
  const { page, perPage } = parsePagination(url);
  const items = await db
    .select({
      id: reports.id,
      targetType: reports.targetType,
      targetId: reports.targetId,
      reason: reports.reason,
      status: reports.status,
      createdAt: reports.createdAt,
      reporter: users.username,
      targetContent: sql<string | null>`(SELECT c.content FROM comments c WHERE ${reports.targetType} = 'comment' AND c.id = ${reports.targetId})`,
    })
    .from(reports)
    .innerJoin(users, eq(users.id, reports.reporterId))
    .where(eq(reports.status, status))
    .orderBy(desc(reports.createdAt))
    .limit(perPage)
    .offset((page - 1) * perPage);
  const [countRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(reports)
    .where(eq(reports.status, status));
  return ok(items, paginationMeta(page, perPage, countRow?.count ?? 0));
});

const resolveSchema = z.object({
  reportId: z.coerce.number().int().positive(),
  action: z.enum(["resolve", "dismiss"]),
  /** optional: hide the reported comment when resolving */
  hideTarget: z.boolean().optional(),
});

/** POST /api/v1/admin/reports — resolve/dismiss (+ optionally hide target). */
export const POST = route(async (req: NextRequest) => {
  const csrf = sameOriginGuard(req);
  if (csrf) return csrf;
  const { user: admin, denied } = await adminGuard("moderator");
  if (denied || !admin) return denied;

  const parsed = resolveSchema.safeParse(await jsonBody(req).catch(() => null));
  if (!parsed.success) return fail(400, "VALIDATION_ERROR", "Dữ liệu không hợp lệ");
  const { reportId, action, hideTarget } = parsed.data;

  const [report] = await db.select().from(reports).where(eq(reports.id, reportId)).limit(1);
  if (!report) return fail(404, "REPORT_NOT_FOUND", "Báo cáo không tồn tại");

  await db
    .update(reports)
    .set({ status: action === "resolve" ? "resolved" : "dismissed", resolvedBy: admin.id, resolvedAt: new Date() })
    .where(eq(reports.id, reportId));

  if (action === "resolve" && hideTarget && report.targetType === "comment") {
    await db.update(comments).set({ status: "hidden" }).where(eq(comments.id, report.targetId));
  }
  await audit(admin.id, `report-${action}`, "report", reportId, { hideTarget: hideTarget ?? false });
  return ok({ reportId, status: action === "resolve" ? "resolved" : "dismissed" });
});
