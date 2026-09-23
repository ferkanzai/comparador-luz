import { test as base, expect } from "@playwright/test";

/** Fails any test whose main page reports a Content-Security-Policy violation. */
export const test = base.extend<{ cspViolations: void }>({
  cspViolations: [
    async ({ page }, use) => {
      const violations: string[] = [];
      page.on("console", (message) => {
        if (
          message.type() === "error" &&
          message.text().includes("Content Security Policy")
        )
          violations.push(message.text());
      });
      await use();
      expect(violations, "Content-Security-Policy violations").toEqual([]);
    },
    { auto: true },
  ],
});
export { expect };
