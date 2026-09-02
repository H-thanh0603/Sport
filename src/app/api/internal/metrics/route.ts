import { NextRequest } from "next/server";
import { route, fail } from "@/server/http/api";
import { metrics } from "@/server/metrics";

export const dynamic = "force-dynamic";

/** Prometheus scrape format — guarded by METRICS_TOKEN. */
export const GET = route(async (req: NextRequest) => {
  const token = process.env.METRICS_TOKEN;
  if (token) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${token}`) return fail(401, "UNAUTHORIZED", "Invalid metrics token");
  }
  const text = metrics.render();
  return new Response(text, {
    status: 200,
    headers: { "Content-Type": "text/plain; version=0.0.4" },
  });
});
