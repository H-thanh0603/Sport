/**
 * Vitest global setup for integration tests — create DB `sport_g_test` once per run.
 * Unit-only runs (`vitest run tests/unit`) skip this via config projects.
 */

import { execSync } from "node:child_process";

const TEST_DB = process.env.TEST_DATABASE_URL ?? "postgres://sport@localhost:5433/sport_g_test";
const ADMIN_URL = "postgres://sport@localhost:5433/postgres";
const DB_NAME = new URL(TEST_DB).pathname.replace("/", "");

export async function setup(): Promise<void> {
  // DROP+CREATE cannot share one psql -c (transaction block) — separate calls
  execSync(`psql "${ADMIN_URL}" -c "DROP DATABASE IF EXISTS ${DB_NAME} WITH (FORCE);"`, {
    stdio: "inherit",
  });
  execSync(`psql "${ADMIN_URL}" -c "CREATE DATABASE ${DB_NAME};"`, { stdio: "inherit" });
  execSync("npx drizzle-kit migrate", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: TEST_DB },
  });
  execSync("npx tsx src/db/seed.ts", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: TEST_DB },
  });
}

export async function teardown(): Promise<void> {
  // keep DB around for debugging; CI relies on the DROP+CREATE above next run
}
