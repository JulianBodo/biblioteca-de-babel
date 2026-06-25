import { defineConfig } from "@playwright/test";

const port = process.env.TEST_PORT ?? "3001";
const baseURL = process.env.API_BASE_URL ?? `http://localhost:${port}`;

/** Playwright levanta la API en TEST_PORT (3001) y corre tests en tests/api/. */
export default defineConfig({
  testDir: "./tests/api",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  reporter: [
    ["list"],
    [
      "allure-playwright",
      {
        resultsDir: "allure-results",
        detail: true,
        suiteTitle: true,
        environmentInfo: {
          node_version: process.version,
          os: process.platform,
        },
      },
    ],
  ],
  globalSetup: "./tests/global-setup.ts",
  use: {
    baseURL,
    extraHTTPHeaders: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  },
  webServer: {
    command: `npx tsx src/init.ts`,
    url: `${baseURL}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      ...process.env,
      PORT: port,
    },
  },
});
