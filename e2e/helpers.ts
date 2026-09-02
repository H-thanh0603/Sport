import type { Page } from "@playwright/test";

/**
 * Session login helper — bypasses the B login-form bug (see auth.spec NOTE).
 * Using the browser-context's request shares cookies with page navigation,
 * so the session cookie set here is automatically used by page.goto.
 */
export async function loginViaApi(page: Page): Promise<void> {
  const res = await page.context().request.post("/api/v1/auth/login", {
    data: { identifier: "user1@sport.local", password: "user12345" },
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok()) throw new Error(`api login failed: ${res.status}`);
}
