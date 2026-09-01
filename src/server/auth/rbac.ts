import type { SessionUser } from "./session";
import { redirect } from "next/navigation";

export const ROLE_RANK = { user: 0, moderator: 1, admin: 2 } as const;
export type Role = keyof typeof ROLE_RANK;

export function hasRole(user: SessionUser | null, min: Role): boolean {
  if (!user) return false;
  return ROLE_RANK[user.role] >= ROLE_RANK[min];
}

/** API guard — returns null if OK, or a Response to return immediately. */
export function requireRole(user: SessionUser | null, min: Role): Response | null {
  if (!user) {
    return Response.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } },
      { status: 401 },
    );
  }
  if (!hasRole(user, min)) {
    return Response.json(
      {
        success: false,
        error: { code: "FORBIDDEN", message: "Insufficient permissions" },
      },
      { status: 403 },
    );
  }
  return null;
}

/** Page guard (server components) — redirect unauthenticated users. */
export async function requireUserPage(path = "/login"): Promise<SessionUser> {
  const { getSessionUser } = await import("./session");
  const user = await getSessionUser();
  if (!user) redirect(path);
  return user;
}

export async function requireRolePage(min: Role, path = "/login"): Promise<SessionUser> {
  const user = await requireUserPage(path);
  if (!hasRole(user, min)) redirect("/403");
  return user;
}
