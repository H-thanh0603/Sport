import { describe, expect, it } from "vitest";
import {
  formatDate,
  formatMatchTime,
  formatRelative,
  formatScore,
  formatTimeOnly,
  statusLabel,
} from "@/lib/format";

describe("format — timezone + DST", () => {
  // UTC instant with unambiguous offset: 2026-06-15T12:00:00Z (summer, EDT=UTC-4)
  const summer = "2026-06-15T12:00:00Z";
  // 2026-12-15T12:00:00Z (winter, EST=UTC-5) — same wall-hour rule differs by DST
  const winter = "2026-12-15T12:00:00Z";

  it("renders same instant differently per timezone (EDT vs ICT)", () => {
    const edt = formatTimeOnly(summer, "America/New_York");
    const ict = formatTimeOnly(summer, "Asia/Ho_Chi_Minh");
    expect(edt).toBe("08:00"); // UTC-4 (DST active)
    expect(ict).toBe("19:00"); // UTC+7, no DST
  });

  it("DST shifts the same UTC hour between seasons (EDT vs EST)", () => {
    const edtSummer = formatTimeOnly(summer, "America/New_York");
    const estWinter = formatTimeOnly(winter, "America/New_York");
    expect(edtSummer).toBe("08:00"); // -4
    expect(estWinter).toBe("07:00"); // -5 — DST boundary correctness
  });

  it("formatMatchTime includes day+month in target tz", () => {
    // 2026-09-02T01:30:00Z → Vietnam same day 08:30
    expect(formatMatchTime("2026-09-02T01:30:00Z", "Asia/Ho_Chi_Minh")).toContain("08:30");
    expect(formatMatchTime("2026-09-02T01:30:00Z", "Asia/Ho_Chi_Minh")).toContain("02/09");
    // New York previous calendar day: 01/09 21:30
    expect(formatMatchTime("2026-09-02T01:30:00Z", "America/New_York")).toContain("01/09");
    expect(formatMatchTime("2026-09-02T01:30:00Z", "America/New_York")).toContain("21:30");
  });

  it("formatDate renders numeric date", () => {
    expect(formatDate("2026-09-02T00:00:00Z", "UTC")).toBe("02/09/2026");
  });

  it("default (no tz) uses runtime local — stable via UTC-pinned cases", () => {
    // Europe/London in winter = UTC+0 → deterministic regardless of host tz? No:
    // formatTimeOnly without tz uses host timezone. Pin explicitly instead.
    expect(formatTimeOnly("2026-12-15T12:00:00Z", "UTC")).toBe("12:00");
  });
});

describe("format — relative time", () => {
  const now = Date.now();
  const ago = (ms: number) => new Date(now - ms).toISOString();

  it("buckets minutes/hours/days", () => {
    expect(formatRelative(ago(30_000))).toBe("vừa xong");
    expect(formatRelative(ago(5 * 60_000))).toBe("5 phút trước");
    expect(formatRelative(ago(3 * 3_600_000))).toBe("3 giờ trước");
    expect(formatRelative(ago(2 * 86_400_000))).toBe("2 ngày trước");
  });

  it("falls back to date beyond 7 days", () => {
    const out = formatRelative(ago(10 * 86_400_000));
    expect(out).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });
});

describe("format — score + status labels", () => {
  it("score: '- vs -' when not started", () => {
    expect(formatScore({ homeScore: null, awayScore: null })).toBe("- vs -");
  });

  it("score: renders both when present", () => {
    expect(formatScore({ homeScore: 2, awayScore: 1 })).toBe("2 - 1");
    expect(formatScore({ homeScore: 0, awayScore: 0 })).toBe("0 - 0");
  });

  it("status labels per WORKPLAN §5.4", () => {
    expect(statusLabel("live")).toBe("LIVE");
    expect(statusLabel("halftime")).toBe("HT");
    expect(statusLabel("finished")).toBe("FT");
    expect(statusLabel("postponed")).toBe("Hoãn");
    expect(statusLabel("cancelled")).toBe("Hủy");
    expect(statusLabel("scheduled")).toBe("Sắp diễn ra");
    expect(statusLabel("weird-unknown")).toBe("weird-unknown");
  });
});
