import { expect, test } from "@playwright/test";

/**
 * Admin — spec E2E #6 (login admin → dashboard → moderation).
 * Package F (admin app) not merged on main yet: feature-detect and skip.
 * Admin credential comes from seed (admin@sport.local / ADMIN_PASSWORD).
 */

test("admin can login and reach dashboard (Package F feature-detect)", async ({ page, baseURL }) => {
  const merged = await adminExists(baseURL!);
  test.skip(!merged, "/admin not merged yet (Package F)");

  await page.goto("/login");
  await page.getByLabel("Email").fill("admin@sport.local");
  await page.getByLabel("Mật khẩu").fill(process.env.ADMIN_PASSWORD ?? "change-me");
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await page.waitForURL(/admin|\/$/, { timeout: 15_000 });

  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: /Dashboard/i })).toBeVisible();
});

async function adminExists(baseURL: string): Promise<boolean> {
  try {
    const res = await fetch(`${baseURL}/admin`, { redirect: "manual" });
    // exists (even if redirecting) vs 404
    return res.status !== 404;
  } catch {
    return false;
  }
}
