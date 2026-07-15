import { defineConfig, devices } from "@playwright/test";

process.env.WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "test-webhook-secret";

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: "./e2e",
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: "html",
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: "http://localhost:5174",

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: "on-first-retry",
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
  ],

  /* Run local test servers before starting the tests */
  webServer: [
    {
      command: "bun run --filter server dev",
      url: "http://localhost:3002/api/health",
      reuseExistingServer: !process.env.CI,
      env: {
        PORT: "3002",
        DATABASE_URL:
          "postgresql://postgres:postgres@localhost:5432/helpdesk_test?schema=public",
        BETTER_AUTH_URL: "http://localhost:3002",
        CLIENT_URL: "http://localhost:5174",
        NODE_ENV: "test",
        WEBHOOK_SECRET: process.env.WEBHOOK_SECRET || "test-webhook-secret",
        OPENAI_API_KEY: process.env.OPENAI_API_KEY || "mock-key",
      },
      timeout: 60 * 1000,
    },
    {
      command: "bun run --filter client dev",
      url: "http://localhost:5174",
      reuseExistingServer: !process.env.CI,
      env: {
        PORT: "5174",
        VITE_API_URL: "http://localhost:3002",
      },
      timeout: 60 * 1000,
    },
  ],
});
