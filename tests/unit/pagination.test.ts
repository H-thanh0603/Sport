import { describe, expect, it } from "vitest";
import { paginationMeta, parsePagination } from "@/server/http/api";

function url(query = "") {
  return new URL(`http://localhost:3000/api/v1/x${query}`);
}

describe("parsePagination", () => {
  it("defaults page=1 perPage=20", () => {
    expect(parsePagination(url())).toEqual({ page: 1, perPage: 20, offset: 0 });
  });

  it("reads page + perPage and computes offset", () => {
    expect(parsePagination(url("?page=3&perPage=10"))).toEqual({ page: 3, perPage: 10, offset: 20 });
  });

  it("clamps perPage to maxPerPage", () => {
    expect(parsePagination(url("?perPage=500")).perPage).toBe(50);
  });

  it("clamps perPage ≥ 1 and page ≥ 1", () => {
    expect(parsePagination(url("?perPage=0")).perPage).toBe(20); // Number(0) falsy → default
    expect(parsePagination(url("?page=-5")).page).toBe(1);
  });

  it("ignores garbage input", () => {
    expect(parsePagination(url("?page=abc")).page).toBe(1);
    expect(parsePagination(url("?perPage=abc")).perPage).toBe(20);
  });

  it("honors custom defaults", () => {
    expect(
      parsePagination(url(), { page: 2, perPage: 12, maxPerPage: 30 }),
    ).toEqual({ page: 2, perPage: 12, offset: 12 });
  });
});

describe("paginationMeta", () => {
  it("totalPages = ceil(total/perPage), min 1", () => {
    expect(paginationMeta(1, 20, 0).pagination.totalPages).toBe(1);
    expect(paginationMeta(1, 20, 41).pagination.totalPages).toBe(3);
    expect(paginationMeta(2, 20, 40).pagination.totalPages).toBe(2);
  });

  it("hasNext iff page*perPage < total", () => {
    expect(paginationMeta(1, 20, 20).pagination.hasNext).toBe(false);
    expect(paginationMeta(1, 20, 21).pagination.hasNext).toBe(true);
    expect(paginationMeta(2, 10, 15).pagination.hasNext).toBe(false);
  });

  it("round-trips with parsePagination values", () => {
    const { page, perPage } = parsePagination(url("?page=2&perPage=15"));
    const meta = paginationMeta(page, perPage, 30).pagination;
    expect(meta).toMatchObject({ page: 2, perPage: 15, total: 30, totalPages: 2, hasNext: false });
  });
});
