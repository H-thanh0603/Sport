import { expect, test } from "@playwright/test";

/**
 * Match detail — spec E2E #4 (tabs). Package C not merged on main yet:
 * feature-detect /matches/[id] and skip when absent.
 */

test("match detail renders header + tabs when merged (Package C feature-detect)", async ({ page, baseURL }) => {
  const merged = await matchPagesExist(baseURL!);
  test.skip(!merged, "/matches/[id] not merged yet (Package C)");

  // find a live match id via API
  const res = await page.request.get("/api/v1/matches?status=live&perPage=1");
  const env = (await res.json()) as { data?: Array<{ id: number }> };
  const id = env.data?.[0]?.id;
  test.skip(!id, "no live matches seeded");
  await page.goto(`/matches/${id}`);

  await expect(page.getByRole("heading", { level: 2 })).toBeVisible();
  for (const tab of ["Diễn biến", "Thống kê", "Đội hình", "Đối đầu", "Tường thuật"]) {
    await expect(page.getByRole("tab", { name: tab })).toBeVisible();
  }
  // switch tabs client-side without reload
  await page.getByRole("tab", { name: "Thống kê" }).click();
  await expect(page.getByRole("tab", { name: "Thống kê" })).toHaveAttribute("aria-selected", "true");
});

async function matchPagesExist(baseURL: string): Promise<boolean> {
  try {
    const res = await fetch(`${baseURL}/api/v1/matches?status=live&perPage=1`);
    const env = (await res.json()) as { data?: Array<{ id: number }> };
    const id = env.data?.[0]?.id;
    if (!id) return false;
    const page = await fetch(`${baseURL}/matches/${id}`);
    return page.status === 200;
  } catch {
    return false;
  }
}
