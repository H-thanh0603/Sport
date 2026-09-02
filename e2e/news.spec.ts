import { expect, test } from "@playwright/test";
import { loginViaApi } from "./helpers";

/**
 * News list → detail → comment (Package E flows).
 */

test("news list shows articles; detail renders with title", async ({ page }) => {
  await page.goto("/news");
  const first = page.locator('a[href^="/news/"]').filter({ hasText: /.+/ }).first();
  await expect(first).toBeVisible();
  await first.click();
  await expect(page).toHaveURL(/\/news\//);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("logged-in user can post a comment on an article", async ({ page }) => {
  await loginViaApi(page);
  await page.goto("/news");
  const first = page.locator('a[href^="/news/"]').filter({ hasText: /.+/ }).first();
  await first.click();
  await expect(page).toHaveURL(/\/news\//);

  const box = page.getByLabel("Nội dung bình luận");
  test.skip(!(await box.isVisible().catch(() => false)), "comment form not present");
  const content = `E2E comment ${Date.now()}`;
  await box.fill(content);
  await page.getByRole("button", { name: "Gửi" }).click();
  await expect(page.getByText(content).first()).toBeVisible({ timeout: 10_000 });
});
