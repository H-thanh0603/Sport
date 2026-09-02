import { expect, test } from "@playwright/test";

/**
 * Auth E2E.
 *
 * NOTE(g) — KNOWN BUG (Package B login page, filed in WORKPLAN §8):
 * the form posts `{ email, password }` but the API expects `{ identifier,
 * password }` → every UI login fails with VALIDATION_ERROR "Dữ liệu không hợp lệ".
 * The login tests are marked test.fail intentionally: they pass iff the bug
 * is present, and will start failing (loudly) once B fixes the field name —
 * then flip them back to test().
 */

test.describe("UI login (Package B bug — see WORKPLAN §8)", () => {
  test.fail("login with seeded demo user", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("user1@sport.local");
    await page.getByLabel("Mật khẩu").fill("user12345");
    await page.getByRole("button", { name: "Đăng nhập" }).click();
    // currently: validation error, no redirect (bug)
    await page.waitForURL("/", { timeout: 10_000 });
  });

  test("login rejects wrong password with validation error visible", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("user1@sport.local");
    await page.getByLabel("Mật khẩu").fill("wrongpass1");
    await page.getByRole("button", { name: "Đăng nhập" }).click();
    // with the identifier bug every attempt shows the validation alert;
    // once B fixes it, this becomes "Sai email hoặc mật khẩu"
    await expect(page.locator("p[role=alert]")).toContainText(/không hợp lệ|sai|thất bại/i);
  });
});

test("register creates account and lands logged in", async ({ page }) => {
  const email = `e2e_${Date.now()}@test.local`;
  await page.goto("/register");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Tên hiển thị").fill("E2E User");
  await page.getByLabel("Tên đăng nhập").fill(`e2e_${Date.now() % 100000}`);
  await page.getByLabel("Mật khẩu").fill("e2epass1");
  await page.getByRole("button", { name: "Tạo tài khoản" }).click();
  // B's register flow routes to verify-email notice (session already created)
  await page.waitForURL(/verify-email/, { timeout: 15_000 });
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
});
