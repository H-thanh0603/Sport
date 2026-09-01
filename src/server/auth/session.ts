import { cookies } from "next/headers";
import { and, eq, gt, lt } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import { generateToken, sha256 } from "./tokens";
import { logger } from "@/server/logger";

export const SESSION_COOKIE = "sport_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export type SessionUser = {
  id: number;
  email: string;
  username: string;
  displayName: string;
  role: "user" | "moderator" | "admin";
  avatarUrl: string | null;
  emailVerified: boolean;
};

/** Create a session row + set HttpOnly cookie. */
export async function createSession(userId: number): Promise<void> {
  const token = generateToken(32);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.insert(sessions).values({ userId, tokenHash: sha256(token), expiresAt });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

/** Validate session cookie → user, or null. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      username: users.username,
      displayName: users.displayName,
      role: users.role,
      avatarUrl: users.avatarUrl,
      status: users.status,
      emailVerifiedAt: users.emailVerifiedAt,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.tokenHash, sha256(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);
  const row = rows[0];
  if (!row || row.status === "banned") return null;
  return {
    id: row.id,
    email: row.email,
    username: row.username,
    displayName: row.displayName,
    role: row.role,
    avatarUrl: row.avatarUrl,
    emailVerified: row.emailVerifiedAt !== null,
  };
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.delete(sessions).where(eq(sessions.tokenHash, sha256(token)));
  }
  jar.delete(SESSION_COOKIE);
}

/** Housekeeping — call from worker; also guards against expired rows piling up. */
export async function purgeExpiredSessions(): Promise<number> {
  const res = await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
  logger.info("purged expired sessions", { count: res.count });
  return res.count;
}

/** For tests/maintenance: invalidate all sessions of a user (e.g. after ban). */
export async function revokeUserSessions(userId: number): Promise<void> {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}
