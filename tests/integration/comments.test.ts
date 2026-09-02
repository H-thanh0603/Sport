import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { news, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "@/server/auth/password";
import { newsRepo } from "@/server/repositories/news.repo";

/**
 * Comments: insert → visible listing → nested reply → pending moderation count
 * (spam-heuristic flagging lives in the HTTP route; queue counting here).
 */

describe("comments — insert, thread, moderation queue", () => {
  let userId: number;
  let newsId: number;

  beforeAll(async () => {
    const [u] = await db
      .insert(users)
      .values({
        email: `g-cmt-${Date.now()}@test.local`,
        username: `g_cmt_${Date.now() % 100000}`,
        displayName: "Commenter",
        passwordHash: await hashPassword("pass1234"),
        emailVerifiedAt: new Date(),
      })
      .returning({ id: users.id });
    userId = u!.id;
    const [n] = await db.select({ id: news.id }).from(news).limit(1);
    newsId = n!.id;
  });

  afterAll(async () => {
    await db.delete(users).where(eq(users.id, userId));
  });

  it("inserts a visible comment and lists it newest-first-ish", async () => {
    const id = await newsRepo.insertComment({ newsId, userId, content: "G test: trận hay!" });
    expect(id).toBeGreaterThan(0);
    const listed = await newsRepo.comments(newsId);
    expect(listed.some((c) => c.id === id && c.content === "G test: trận hay!")).toBe(true);
  });

  it("nested reply keeps parentId chain", async () => {
    const parent = await newsRepo.insertComment({ newsId, userId, content: "G parent" });
    const child = await newsRepo.insertComment({ newsId, userId, content: "G child", parentId: parent });
    expect(child).toBeGreaterThan(parent);
    const listed = await newsRepo.comments(newsId);
    const childRow = listed.find((c) => c.id === child);
    expect(childRow?.parentId).toBe(parent);
  });

  it("pending moderation queue counts only pending rows", async () => {
    const before = await newsRepo.pendingCount();
    const id = await newsRepo.insertComment({ newsId, userId, content: "G pending probe" });
    const after = await newsRepo.pendingCount();
    // repo inserts default 'visible' — queue must not grow
    expect(after).toBe(before);
    // flip to pending and verify count grows, then restore
    const { sql } = await import("drizzle-orm");
    await db.execute(sql`UPDATE comments SET status = 'pending' WHERE id = ${id}`);
    const withPending = await newsRepo.pendingCount();
    expect(withPending).toBe(before + 1);
    await db.execute(sql`UPDATE comments SET status = 'visible' WHERE id = ${id}`);
    const restored = await newsRepo.pendingCount();
    expect(restored).toBe(before);
  });
});
