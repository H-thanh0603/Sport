import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { emailTokens, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { consumeEmailToken, issueEmailToken, markEmailVerified } from "@/server/auth/email";
import { generateToken, sha256 } from "@/server/auth/tokens";

/**
 * Auth flow integration (service/token layer — HTTP layer covered by E2E):
 * register-equivalent → email token issued (captured from dev-mode log)
 * → verify consume → reset token flow → single-use enforcement
 * → password hash round-trip.
 */

const captureToken = async (): Promise<string> => {
  const calls: string[] = [];
  const spy = vi.spyOn(console, "info").mockImplementation((...args: unknown[]) => {
    for (const a of args) if (typeof a === "string" && a.includes("token=")) calls.push(a);
  });
  try {
    return await new Promise<string>((resolve) => {
      const tick = setInterval(() => {
        if (calls.length > 0) {
          clearInterval(tick);
          resolve(calls[0]!.split("token=")[1]!.split(/["'\s]/)[0]!);
        }
      }, 10);
    });
  } finally {
    spy.mockRestore();
  }
};

describe("auth — token + password flows (DB)", () => {
  let userId: number;
  const email = `g-int-${Date.now()}@test.local`;

  beforeEach(async () => {
    const [row] = await db
      .insert(users)
      .values({
        email,
        username: `g_int_${Date.now() % 100000}`,
        displayName: "G Integration",
        passwordHash: await hashPassword("secret123"),
      })
      .returning({ id: users.id });
    userId = row!.id;
  });

  afterEach(async () => {
    await db.delete(users).where(eq(users.id, userId));
  });

  it("password hash round-trip", async () => {
    const hash = await hashPassword("pass1234");
    expect(hash).not.toContain("pass1234");
    await expect(verifyPassword(hash, "pass1234")).resolves.toBe(true);
    await expect(verifyPassword(hash, "wrong0000")).resolves.toBe(false);
  });

  it("verify_email token: issue → consume → marks verified; single-use", async () => {
    const tokenPromise = captureToken();
    await issueEmailToken(userId, "verify_email", email);
    const token = await tokenPromise;
    expect(token.length).toBeGreaterThanOrEqual(20);

    const consumedId = await consumeEmailToken(token, "verify_email");
    expect(consumedId).toBe(userId);

    await markEmailVerified(userId);
    const [row] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    expect(row!.emailVerifiedAt).not.toBeNull();

    // single-use: second consume fails
    await expect(consumeEmailToken(token, "verify_email")).resolves.toBeNull();
  });

  it("reset_password token: issue → consume → rotate password → revoke reuse", async () => {
    const tokenPromise = captureToken();
    await issueEmailToken(userId, "reset_password", email);
    const token = await tokenPromise;

    const consumedId = await consumeEmailToken(token, "reset_password");
    expect(consumedId).toBe(userId);

    const newHash = await hashPassword("newpass99");
    await db.update(users).set({ passwordHash: newHash }).where(eq(users.id, userId));
    await expect(verifyPassword(newHash, "newpass99")).resolves.toBe(true);

    await expect(consumeEmailToken(token, "reset_password")).resolves.toBeNull();
  });

  it("rejects garbage + wrong-purpose tokens", async () => {
    await expect(consumeEmailToken(generateToken(32), "verify_email")).resolves.toBeNull();
    const tokenPromise = captureToken();
    await issueEmailToken(userId, "reset_password", email);
    const token = await tokenPromise;
    // right token, wrong purpose
    await expect(consumeEmailToken(token, "verify_email")).resolves.toBeNull();
    // wrong token shape
    await expect(consumeEmailToken("short", "verify_email")).resolves.toBeNull();
  });

  it("token stores only sha256 hash (plaintext never persisted)", async () => {
    const tokenPromise = captureToken();
    await issueEmailToken(userId, "verify_email", email);
    const token = await tokenPromise;
    const rows = await db.select().from(emailTokens).where(eq(emailTokens.userId, userId));
    const stored = rows.map((r) => r.tokenHash);
    expect(stored).not.toContain(token);
    expect(stored).toContain(sha256(token));
  });
});
