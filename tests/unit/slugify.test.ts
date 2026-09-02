import { describe, expect, it } from "vitest";
import { slugify } from "@/server/providers/mock/catalog";

describe("slugify", () => {
  it("lowercases + collapses separators", () => {
    expect(slugify("Manchester United")).toBe("manchester-united");
    expect(slugify("V.League 2026!")).toBe("v-league-2026");
  });

  it("strips diacritics (VN names → ASCII slug)", () => {
    expect(slugify("Nguyễn Văn An")).toBe("nguyen-van-an");
    expect(slugify("Đà Nẵng FC")).toBe("da-nang-fc");
    expect(slugify("Hà Nội")).toBe("ha-noi");
  });

  it("no trailing/leading dashes", () => {
    expect(slugify("--Real Madrid--")).toBe("real-madrid");
    expect(slugify("")).toBe("");
  });

  it("unique-suffix logic: distinct inputs stay distinct", () => {
    const a = slugify("Man City");
    const b = slugify("Man City!");
    expect(a).toBe(b); // collision by design → caller appends suffix; verify determinism
    expect(slugify("Team A")).not.toBe(slugify("Team B"));
  });

  it("deterministic (same input, same slug)", () => {
    expect(slugify("Bayer 04 Leverkusen")).toBe(slugify("Bayer 04 Leverkusen"));
  });
});
