import { NextRequest } from "next/server";
import { route, ok } from "@/server/http/api";
import { adminStatsRepo } from "@/server/repositories/engagement.repo";
import { newsRepo } from "@/server/repositories/news.repo";
import { db } from "@/db";
import { jobRuns } from "@/db/schema";
import { desc } from "drizzle-orm";
import { adminGuard } from "../helpers";

/** GET /api/v1/admin/dashboard — stat cards + pending counts + recent jobs. */
export const GET = route(async (_req: NextRequest) => {
  const { denied } = await adminGuard();
  if (denied) return denied;

  const [stats, pendingComments, recentJobs] = await Promise.all([
    adminStatsRepo.dashboard(),
    newsRepo.pendingCount(),
    db.select().from(jobRuns).orderBy(desc(jobRuns.id)).limit(8),
  ]);
  return ok({ ...stats, pendingComments, recentJobs });
});

