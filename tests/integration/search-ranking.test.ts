import { describe, expect, it } from "vitest";
import { searchRepo } from "@/server/repositories/search.repo";

/** Trigram ranking (pg_trgm): typo tolerance + relevance ordering. */

describe("search ranking (trigram)", () => {
  it("finds Manchester United for 'man utd' (fuzzy)", async () => {
    const results = await searchRepo.all("man utd");
    expect(results.teams.map((t) => t.name)).toContain("Manchester United");
    expect(results.total).toBeGreaterThan(0);
  });

  it("typo tolerance: trailing-typo query still finds Manchester United", async () => {
    const results = await searchRepo.all("manchester unitede");
    expect(results.teams.some((t) => t.name === "Manchester United")).toBe(true);
  });

  it("exact query ranks the exact team first", async () => {
    const results = await searchRepo.all("manchester united");
    expect(results.teams[0]!.name).toBe("Manchester United");
  });

  it("suggest mixes entity types including teams for 'man'", async () => {
    const suggestions = await searchRepo.suggest("man");
    expect(suggestions.length).toBeGreaterThan(0);
    const types = [...new Set(suggestions.map((s) => s.type))];
    expect(types).toContain("team");
  });

  it("short queries (<2 chars) return empty", async () => {
    const results = await searchRepo.all("m");
    expect(results.total).toBe(0);
  });

  it("no match → empty, not error", async () => {
    const results = await searchRepo.all("zzzzqqqqxxxx");
    expect(results.total).toBe(0);
    expect(results.teams).toEqual([]);
  });
});
