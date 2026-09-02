import { describe, expect, it, vi } from "vitest";
import { matchesService } from "@/server/services/matches.service";
import { matchesRepo } from "@/server/repositories/matches.repo";
import { invalidate } from "@/server/cache";

/**
 * Cache-aside verification: second call within TTL must NOT hit the DB
 * (repo queries spied); after invalidate(), the loader runs again.
 */

describe("matches service — cache TTL", () => {
  it("getLiveMatches hits DB once within TTL (5s), again after invalidate", async () => {
    const spy = vi.spyOn(matchesRepo, "live");
    try {
      await invalidate("v1:live:all");
      await matchesService.getLiveMatches();
      const firstCalls = spy.mock.calls.length;
      expect(firstCalls).toBeGreaterThan(0);

      await matchesService.getLiveMatches();
      await matchesService.getLiveMatches();
      // memo + redis/memory cache → loader not invoked again
      expect(spy.mock.calls.length).toBe(firstCalls);

      await invalidate("v1:live:all");
      await matchesService.getLiveMatches();
      expect(spy.mock.calls.length).toBeGreaterThan(firstCalls);
    } finally {
      spy.mockRestore();
    }
  });

  it("upcoming list caches per filter-key (different key → new DB call)", async () => {
    const spy = vi.spyOn(matchesRepo, "upcoming");
    try {
      await invalidate("v1:schedule:");
      await matchesService.getUpcomingMatches({ window: "today", perPage: 5 });
      const afterFirst = spy.mock.calls.length;

      await matchesService.getUpcomingMatches({ window: "today", perPage: 5 });
      expect(spy.mock.calls.length).toBe(afterFirst); // same key cached

      await matchesService.getUpcomingMatches({ window: "tomorrow", perPage: 5 });
      expect(spy.mock.calls.length).toBe(afterFirst + 1); // different key
    } finally {
      spy.mockRestore();
    }
  });

  it("finished match detail caches 30m (1800s) per id", async () => {
    // h2h query only runs when buildDetail executes (inside the cached block)
    const h2hSpy = vi.spyOn(matchesRepo, "h2h");
    try {
      const rows = await matchesRepo.results({ perPage: 1 }, 1, 0);
      const id = rows.items[0]!.id;
      await invalidate(`v1:match:detail:${id}`);

      const first = await matchesService.getMatchDetail(id);
      expect(first).not.toBeNull();
      const callsAfterFirst = h2hSpy.mock.calls.length;
      expect(callsAfterFirst).toBeGreaterThan(0);

      const second = await matchesService.getMatchDetail(id);
      expect(second).toEqual(first);
      expect(h2hSpy.mock.calls.length).toBe(callsAfterFirst); // cached, no re-query
    } finally {
      h2hSpy.mockRestore();
    }
  });
});
