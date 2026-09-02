/**
 * Per-file DB bootstrap for integration tests.
 * Usage (top of integration test):
 *   import { it_db } from "../helpers/db";
 *   describe("...", () => { beforeAll(it_db.setup); afterAll(it_db.teardown); });
 *
 * One shared DB `sport_g_test` per vitest RUN (not per file) — created via
 * tests/integration/global-setup.ts. File-scoped isolation: each test file
 * uses its own users/news rows; matches seed data is read-only for most suites.
 */

import { execSync } from "node:child_process";

const TEST_DB = process.env.TEST_DATABASE_URL ?? "postgres://sport@localhost:5433/sport_g_test";
const ADMIN_URL = "postgres://sport@localhost:5433/postgres";
const DB_NAME = new URL(TEST_DB).pathname.replace("/", "");

export const it_db = {
  url: TEST_DB,
  name: DB_NAME,

  /** migrate + seed — idempotent (seed is onConflict upserts). */
  async setup(): Promise<void> {
    execSync("npx drizzle-kit migrate", {
      stdio: "inherit",
      env: { ...process.env, DATABASE_URL: TEST_DB },
    });
    execSync("npx tsx src/db/seed.ts", {
      stdio: "inherit",
      env: { ...process.env, DATABASE_URL: TEST_DB },
    });
  },

  /** Drop the whole test DB — run once per vitest run (global teardown). */
  async drop(): Promise<void> {
    execSync(
      `psql "${ADMIN_URL}" -c 'SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${DB_NAME}' AND pid <> pg_backend_pid(); DROP DATABASE IF EXISTS ${DB_NAME};'`,
      { stdio: "inherit" },
    );
  },
};
