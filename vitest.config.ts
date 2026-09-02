import { defineConfig } from "vitest/config";
import path from "path";

/**
 * Two projects (WORKPLAN G):
 * - unit: no DB, fast — `npx vitest run --project unit`
 * - integration: DB `sport_g_test` created by global-setup (drop + create +
 *   migrate + seed), torn down next run. Never touches dev DBs.
 * Coverage: `npm run test:coverage` (v8, text + html → coverage/).
 */

export default defineConfig({
  test: {
    globals: true,
    sequence: { concurrent: false },
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      reportsDirectory: "coverage",
      include: ["src/lib/**", "src/server/**"],
      exclude: [
        "src/server/providers/mock/**",
        "src/server/jobs/worker.ts",
      ],
    },
    projects: [
      {
        test: {
          name: "unit",
          environment: "node",
          setupFiles: ["tests/setup.ts"],
          include: ["tests/unit/**/*.test.ts"],
        },
        resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
      },
      {
        test: {
          name: "integration",
          environment: "node",
          setupFiles: ["tests/setup.ts"],
          globalSetup: ["tests/integration/global-setup.ts"],
          include: ["tests/integration/**/*.test.ts"],
          testTimeout: 60_000,
          hookTimeout: 180_000,
        },
        resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
      },
    ],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
