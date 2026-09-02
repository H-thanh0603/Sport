import { NextRequest } from "next/server";

/**
 * Edge-safe session check — middleware cannot use node postgres driver.
 * Reads session cookie only (existence check); role verified again in layout.
 */
export async function createMiddlewareClient(req: NextRequest): Promise<{ isModerator: boolean }> {
  const token = req.cookies.get("sport_session")?.value;
  // ponytail: presence check at edge; real role check happens in admin layout (node runtime).
  // Upgrade: move session lookup to Redis when multi-instance + edge auth needed.
  return { isModerator: !!token };
}
