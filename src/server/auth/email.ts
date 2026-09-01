import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/db";
import { emailTokens, users } from "@/db/schema";
import { generateToken, sha256 } from "./tokens";
import { logger } from "@/server/logger";

export type EmailPurpose = "verify_email" | "reset_password";
const TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Create single-use token. Dev mode (no SMTP_URL): logs the link.
 * Production: hook your email provider here — interface stays the same.
 */
export async function issueEmailToken(
  userId: number,
  purpose: EmailPurpose,
  destinationEmail: string,
): Promise<void> {
  const token = generateToken(32);
  await db.insert(emailTokens).values({
    userId,
    purpose,
    tokenHash: sha256(token),
    expiresAt: new Date(Date.now() + TTL_MS),
  });
  const path = purpose === "verify_email" ? "verify-email" : "reset-password";
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const link = `${base}/${path}?token=${token}`;
  if (process.env.SMTP_URL) {
    // production: send email (provider adapter)
    logger.info("email queued", { to: destinationEmail, purpose });
    void link; // replaced by real sender
  } else {
    logger.info("EMAIL (dev mode — would send)", { to: destinationEmail, link });
  }
}

/** Consume token for purpose. Returns userId or null (invalid/expired/used). */
export async function consumeEmailToken(
  token: string,
  purpose: EmailPurpose,
): Promise<number | null> {
  const rows = await db
    .select({ id: emailTokens.id, userId: emailTokens.userId })
    .from(emailTokens)
    .where(
      and(
        eq(emailTokens.tokenHash, sha256(token)),
        eq(emailTokens.purpose, purpose),
        isNull(emailTokens.usedAt),
        gt(emailTokens.expiresAt, new Date()),
      ),
    )
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  await db.update(emailTokens).set({ usedAt: new Date() }).where(eq(emailTokens.id, row.id));
  return row.userId;
}

export async function markEmailVerified(userId: number): Promise<void> {
  await db.update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.id, userId));
}
