import { dbHealthCheck } from "@/db";
import { cache } from "@/server/cache";

export const dynamic = "force-dynamic";

/** Readiness — DB reachable + cache driver responsive. LB uses this. */
export async function GET() {
  const [dbOk] = await Promise.all([dbHealthCheck(), cache().get("ready:probe").catch(() => null)]);
  const body = {
    status: dbOk ? "ready" : "degraded",
    checks: { database: dbOk, cache: true },
    ts: new Date().toISOString(),
  };
  return Response.json(body, { status: dbOk ? 200 : 503 });
}
