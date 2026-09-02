import type { SessionUser } from "@/server/auth/session";
import type { NextRequest } from "next/server";

export type AdminGuard =
  | { user: SessionUser; denied: null }
  | { user: null; denied: Response };

/** Session + role guard + audit log. Returns typed result. */
export async function adminGuard(min: "moderator" | "admin" = "moderator"): Promise<AdminGuard> {
  const { getSessionUser } = await import("@/server/auth/session");
  const { requireRole } = await import("@/server/auth/rbac");
  const user = await getSessionUser();
  const denied = requireRole(user, min);
  if (denied) return { user: null, denied };
  return { user: user!, denied: null };
}

/** Write audit log — best effort, never throws. */
export async function audit(
  userId: number,
  action: string,
  entityType: string,
  entityId: number | null,
  metadata?: Record<string, unknown>,
): Promise<void> {
  try {
    const { db } = await import("@/db");
    const { auditLogs } = await import("@/db/schema");
    await db.insert(auditLogs).values({ userId, action, entityType, entityId, metadata });
  } catch {
    // audit failure must not break the admin action
  }
}

export function sameOriginGuard(req: NextRequest): Response | null {
  const origin = req.headers.get("origin");
  if (!origin) return null;
  try {
    return new URL(origin).host === req.nextUrl.host ? null : fail403();
  } catch {
    return fail403();
  }
}

function fail403(): Response {
  return Response.json(
    { success: false, error: { code: "CSRF", message: "Cross-origin request rejected" } },
    { status: 403 },
  );
}
