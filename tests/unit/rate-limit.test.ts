import { describe, expect, it } from "vitest";
import { rateLimit } from "@/server/cache/rate-limit";

/** Unique bucket per test — memory cache is module-scoped. */
let seq = 0;
const bucket = () => `rl-test-${seq++}`;

describe("rate-limit — sliding window", () => {
  it("allows up to limit, then blocks", async () => {
    const b = bucket();
    const results = [];
    for (let i = 0; i < 5; i++) {
      results.push(await rateLimit(b, "ip-1", 3, 60));
    }
    expect(results.slice(0, 3).every((r) => r.allowed)).toBe(true);
    expect(results[3]!.allowed).toBe(false);
    expect(results[4]!.allowed).toBe(false);
  });

  it("remaining counts down", async () => {
    const b = bucket();
    const first = await rateLimit(b, "ip-2", 3, 60);
    const second = await rateLimit(b, "ip-2", 3, 60);
    expect(first.remaining).toBe(2);
    expect(second.remaining).toBe(1);
  });

  it("identifiers are isolated within a bucket", async () => {
    const b = bucket();
    await rateLimit(b, "ip-a", 1, 60);
    const other = await rateLimit(b, "ip-b", 1, 60);
    expect(other.allowed).toBe(true);
  });

  it("resetSec reported when blocked", async () => {
    const b = bucket();
    await rateLimit(b, "ip-3", 1, 30);
    const blocked = await rateLimit(b, "ip-3", 1, 30);
    expect(blocked.allowed).toBe(false);
    expect(blocked.resetSec).toBeGreaterThan(0);
    expect(blocked.resetSec).toBeLessThanOrEqual(30);
  });

  it("expired hits drop out of the window (window slides)", async () => {
    const b = bucket();
    // window 1s: seed a hit, advance virtual time via short window
    const first = await rateLimit(b, "ip-4", 1, 1);
    expect(first.allowed).toBe(true);
    const blocked = await rateLimit(b, "ip-4", 1, 1);
    expect(blocked.allowed).toBe(false);
    // wait for the hit to age out (window 1s + margin for TTL set)
    await new Promise((r) => setTimeout(r, 1100));
    const afterWindow = await rateLimit(b, "ip-4", 1, 1);
    expect(afterWindow.allowed).toBe(true);
  });
});
