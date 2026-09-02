import { defineConfig } from "@playwright/test";

/**
 * E2E — runs against its own DB `sport_g_e2e` (never dev DBs).
 * `npm run test:e2e` boots `next dev` on :3100 via webServer below.
 */

const PORT = 3100;
const BASE = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false, // sequential — shared seeded DB
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL: BASE,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    locale: "vi-VN",
  },
  webServer: {
    command: "npm run dev -- --port 3100",
    url: `${BASE}/api/v1/sports`,
    reuseExistingServer: false,
    timeout: 180_000,
    stdout: "ignore",
    stderr: "pipe",
    env: {
      DATABASE_URL: "postgres://sport@localhost:5433/sport_g_e2e",
      AUTH_SECRET: "e2e-secret-not-for-prod",
      LOG_LEVEL: "warn",
      NEXT_PUBLIC_SITE_URL: BASE,
    },
  },
  projects: [
    { name: "desktop-chromium", use: { browserName: "chromium", viewport: { width: 1280, height: 800 } } },
    { name: "mobile-chromium", use: { browserName: "chromium", viewport: { width: 375, height: 700 } } },
  ],
});
