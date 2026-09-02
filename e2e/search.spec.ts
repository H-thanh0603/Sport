import { expect, test } from "@playwright/test";

/**
 * Search "man utd" → Manchester United (trigram) — spec E2E #3.
 * Team page itself belongs to Package D (not merged): click-through is
 * feature-detected and skipped until /teams/[slug] exists.
 */

test("search 'man utd' finds Manchester United", async ({ page }) => {
  await page.goto("/search?q=man%20utd");
  await expect(page.getByRole("heading", { name: /Kết quả cho/i })).toBeVisible();
  const teams = page.getByRole("region", { name: /Đội bóng/ });
  await expect(teams).toBeVisible();
  await expect(teams.getByText("Manchester United")).toBeVisible();
});

test("search trigger opens the command menu with suggestions", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Tìm kiếm/ }).first().click();
  const box = page.getByPlaceholder(/Tìm đội, cầu thủ/);
  await box.fill("man");
  await expect(page.getByText("Manchester United").first()).toBeVisible({ timeout: 10_000 });
});

test("clicking a team result navigates to /teams/[slug] (Package D feature-detect)", async ({ page, baseURL }) => {
  test.skip(!(await teamPagesExist(baseURL!)), "/teams/[slug] not merged yet (Package D)");
  await page.goto("/search?q=man%20utd");
  await page.getByRole("region", { name: /Đội bóng/ }).getByText("Manchester United").click();
  await expect(page).toHaveURL(/\/teams\//);
});

async function teamPagesExist(baseURL: string): Promise<boolean> {
  try {
    const res = await fetch(`${baseURL}/search?q=man%20utd`);
    const html = await res.text();
    return html.includes('href="/teams/');
  } catch {
    return false;
  }
}
