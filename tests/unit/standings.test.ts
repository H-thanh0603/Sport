import { describe, expect, it } from "vitest";
import { standingsForLeague } from "@/server/providers/mock/catalog";

/**
 * Standings computation invariants for the seed generator comparator
 * (actual behavior: points DESC, tie-break goalsFor DESC).
 * NOTE(g): the GA branch in catalog.ts is dead code — operator precedence
 * makes the ternary condition always truthy. Reported in WORKPLAN §8.
 */

describe("standings computation", () => {
  const rows = standingsForLeague("premier-league");

  it("positions are dense 1..N", () => {
    const positions = rows.map((r) => r.position).sort((a, b) => a - b);
    expect(positions).toEqual(Array.from({ length: rows.length }, (_, i) => i + 1));
  });

  it("internal consistency: played = W+D+L, points = 3W+D", () => {
    for (const r of rows) {
      expect(r.played).toBe(r.won + r.drawn + r.lost);
      expect(r.points).toBe(r.won * 3 + r.drawn);
    }
  });

  it("ordering respects points → goalsFor (actual comparator)", () => {
    for (let i = 0; i < rows.length - 1; i++) {
      const a = rows[i]!;
      const b = rows[i + 1]!;
      // descending: earlier row has more points, or equal points and more GF
      const rank = a.points - b.points || a.goalsFor - b.goalsFor;
      expect(rank).toBeGreaterThanOrEqual(0);
    }
  });

  it("every row has 5-char form string of W/D/L", () => {
    for (const r of rows) {
      expect(r.form).toMatch(/^[WDL]{5}$/);
    }
  });
});
