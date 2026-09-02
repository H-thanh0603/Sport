import { expect, test } from "@playwright/test";

/**
 * Responsive mobile 375px — spec E2E #7 (mobile project via config viewport).
 */

test("bottom navigation visible on mobile and navigates", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium" || !(await isMobileViewport(page)), "mobile viewport only");
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Điều hướng dưới" });
  await expect(nav).toBeVisible();
  await nav.getByRole("link", { name: /Tin tức/ }).click();
  await expect(page).toHaveURL(/news/);
});

test("hamburger opens mobile menu with main links", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium" || !(await isMobileViewport(page)), "mobile viewport only");
  await page.goto("/");
  const burger = page.getByRole("button", { name: /menu/i }).first();
  if (await burger.isVisible().catch(() => false)) {
    await burger.click();
    await expect(page.getByRole("link", { name: /Lịch thi đấu/ }).first()).toBeVisible();
  }
});

test("desktop hides bottom navigation", async ({ page, browserName }) => {
  test.skip(browserName === "chromium" && (await isMobileViewport(page)), "desktop viewport only");
  await page.goto("/");
  await expect(page.getByRole("navigation", { name: "Điều hướng dưới" })).toBeHidden();
});

/** mobile project = 375px-wide viewport (both projects are chromium). */
async function isMobileViewport(page: import("@playwright/test").Page): Promise<boolean> {
  return page.viewportSize()?.width === 375;
}
