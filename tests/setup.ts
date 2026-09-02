/**
 * Global test setup — runs before every test file (vitest setupFiles).
 *
 * Unit tests: no DB needed — just sane env.
 * Integration tests: tests/integration/setup-db.ts creates DB `sport_g_test`
 * (migrate + seed + drop) — never touches dev DBs (sport, sport_a…).
 */

process.env.AUTH_SECRET = process.env.AUTH_SECRET ?? "test-secret-not-for-prod";
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? "postgres://sport@localhost:5433/sport_g_test";
// auth integration captures email tokens from dev-mode logger.info output
process.env.LOG_LEVEL = "info";
process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";
