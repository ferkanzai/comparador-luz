import { defineConfig } from "@playwright/test";

const testDatabase = process.env.COMPARISON_TEST_DATABASE_URL;
if (testDatabase) {
  const url = new URL(testDatabase);
  if (
    !["localhost", "127.0.0.1"].includes(url.hostname) ||
    !url.pathname.endsWith("_test")
  )
    throw new Error(
      "Browser account tests require a disposable local *_test database.",
    );
}

export default defineConfig({
  testDir: "./tests/browser",
  outputDir: "output/playwright/test-results",
  workers: 1,
  fullyParallel: false,
  use: {
    baseURL: "http://localhost:3000",
    viewport: { width: 1440, height: 1000 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "pnpm dev --port 3000",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI && !testDatabase,
    env: {
      DATABASE_URL: testDatabase ?? "",
      BETTER_AUTH_SECRET: testDatabase
        ? "local-comparison-browser-tests-only-secret"
        : "",
      BETTER_AUTH_URL: "http://localhost:3000",
      EMAIL_MODE: "console",
      RESEND_API_KEY: "",
      EMAIL_FROM: "",
      VERCEL: "",
      VERCEL_ENV: "",
    },
  },
});
