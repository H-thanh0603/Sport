import { expect, test } from "@playwright/test";

/**
 * Home renders — spec E2E #1.
 * Runs on both desktop + mobile projects (viewport from config).
 */

test("home renders key sections", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Sport/i);

  // header nav present (B)
  await expect(page.getByRole("banner")).toBeVisible();

  // main landmark exists
  await expect(page.getByRole("main")).toBeAttached();
});
