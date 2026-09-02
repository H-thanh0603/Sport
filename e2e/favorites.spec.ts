import { expect, test } from "@playwright/test";
import { loginViaApi } from "./helpers";

/**
 * Profile "Your Sports" after login (Package E).
 */

test("profile shows Your Sports section after login", async ({ page }) => {
  await loginViaApi(page);
  await page.goto("/profile");
  await expect(page.getByText("Your Sports").first()).toBeVisible({ timeout: 10_000 });
});
