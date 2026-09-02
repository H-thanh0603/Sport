
export const dynamic = "force-dynamic";

/** Liveness — process is up. No dependency checks (fast, always 200 when alive). */
export async function GET() {
  return Response.json({ status: "ok", ts: new Date().toISOString() });
}

