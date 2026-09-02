import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { users, teams, favorites } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "@/server/auth/password";
import { favoritesService } from "@/server/services";

/**
 * Favorites CRUD at service level. IDOR check: user B toggling the same
 * (type, targetId) must not affect user A's favorites — every service
 * call is scoped by the caller's userId.
 */

describe("favorites — CRUD + IDOR isolation", () => {
  let userA: number;
  let userB: number;
  let teamId: number;

  const mkUser = async (uname: string) => {
    const [row] = await db
      .insert(users)
      .values({
        email: `${uname}@g-fav.test`,
        username: uname,
        displayName: uname,
        passwordHash: await hashPassword("pass1234"),
        emailVerifiedAt: new Date(),
      })
      .returning({ id: users.id });
    return row!.id;
  };

  beforeAll(async () => {
    const [team] = await db.select().from(teams).limit(1);
    teamId = team!.id;
    userA = await mkUser(`g_fav_a_${Date.now() % 100000}`);
    userB = await mkUser(`g_fav_b_${Date.now() % 100000}`);
  });

  afterAll(async () => {
    await db.delete(favorites).where(eq(favorites.userId, userA));
    await db.delete(favorites).where(eq(favorites.userId, userB));
    await db.delete(users).where(eq(users.id, userA));
    await db.delete(users).where(eq(users.id, userB));
  });

  it("toggle adds then removes (idempotent)", async () => {
    const add = await favoritesService.toggle(userA, "team", teamId);
    expect(add.favorited).toBe(true);
    await expect(favoritesService.exists(userA, "team", teamId)).resolves.toBe(true);

    const remove = await favoritesService.toggle(userA, "team", teamId);
    expect(remove.favorited).toBe(false);
    await expect(favoritesService.exists(userA, "team", teamId)).resolves.toBe(false);
  });

  it("list returns the favorite row for the user", async () => {
    await favoritesService.toggle(userA, "team", teamId);
    const list = await favoritesService.list(userA);
    expect(list.some((f) => f.targetId === teamId && f.type === "team")).toBe(true);
    await favoritesService.toggle(userA, "team", teamId);
  });

  it("IDOR: same target for A and B stays isolated; B's toggle never touches A", async () => {
    // A favorites the team
    await favoritesService.toggle(userA, "team", teamId);
    // B favorites the SAME target — B gets their own row, A's stays
    const bToggle = await favoritesService.toggle(userB, "team", teamId);
    expect(bToggle.favorited).toBe(true);

    await expect(favoritesService.exists(userA, "team", teamId)).resolves.toBe(true);
    await expect(favoritesService.exists(userB, "team", teamId)).resolves.toBe(true);

    const listA = await favoritesService.list(userA);
    const listB = await favoritesService.list(userB);
    const idsA = new Set(listA.map((f) => f.targetId));
    const idsB = new Set(listB.map((f) => f.targetId));
    expect(idsA.has(teamId)).toBe(true);
    expect(idsB.has(teamId)).toBe(true);

    // B removing only affects B
    await favoritesService.toggle(userB, "team", teamId);
    await expect(favoritesService.exists(userA, "team", teamId)).resolves.toBe(true);
    await expect(favoritesService.exists(userB, "team", teamId)).resolves.toBe(false);

    // cleanup A
    await favoritesService.toggle(userA, "team", teamId);
  });

  it("favoriteTeamIds feeds personalization per user", async () => {
    await favoritesService.toggle(userA, "team", teamId);
    const idsA = await favoritesService.favoriteTeamIds(userA);
    const idsB = await favoritesService.favoriteTeamIds(userB);
    expect(idsA).toContain(teamId);
    expect(idsB).not.toContain(teamId);
    await favoritesService.toggle(userA, "team", teamId);
  });
});
