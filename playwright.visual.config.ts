import { defineConfig, devices } from "@playwright/test";
import base from "./playwright.config";

// Screenshots of every screen, to prove a styling change changes nothing,
// or to show exactly what it changes. Run with `pnpm test:visual`.
export default defineConfig({
  ...base,
  testDir: "./tests/visual",
  outputDir: "output/playwright/visual-results",
  snapshotPathTemplate: "tests/visual/screens/{arg}{ext}",
  expect: {
    toHaveScreenshot: {
      animations: "disabled",
      caret: "hide",
      // Anti-aliasing noise only; any real change is far larger.
      maxDiffPixelRatio: 0.001,
    },
  },
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1000 },
      },
    },
    {
      name: "phone",
      use: { ...devices["Pixel 7"], viewport: { width: 390, height: 844 } },
    },
  ],
});
