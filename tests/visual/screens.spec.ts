import type { Page } from "@playwright/test";
import { Client } from "pg";
import { calculate } from "../../src/lib/calculator";
import { billFromCalculation } from "../../src/lib/bill-data";
import type { Workspace } from "../../src/lib/domain";
import {
  comparisonFixture,
  openComparison,
} from "../browser/comparison.fixture";
import { seedWorkspace, signUpVerified } from "../browser/sign-up";
import { expect, test } from "../browser/strict-test";

/** Full pages, except dialogs, which show what is on screen. */
const shot = async (page: Page, name: string, fullPage = true) => {
  await page.evaluate(() => document.fonts.ready);
  // Dialogs and drawers slide or fade in; capture them once settled.
  await page.evaluate(() =>
    Promise.all(document.getAnimations().map((a) => a.finished)),
  );
  // Soft, so one run reports every changed screen.
  await expect
    .soft(page)
    .toHaveScreenshot(`${name}-${test.info().project.name}.png`, {
      fullPage,
      stylePath: "tests/visual/screenshot.css",
      // VISUAL_STRICT=1 counts every changed pixel, for reviewing colour changes.
      ...(process.env.VISUAL_STRICT
        ? { threshold: 0, maxDiffPixelRatio: 0 }
        : {}),
    });
};
const dialog = (page: Page, name: string) => shot(page, name, false);
/** Charts load on demand and draw once measured. */
const drawn = (page: Page) =>
  expect(page.locator(".recharts-cartesian-grid").first()).toBeVisible();

/** The comparison fixture with a past contract and three bills, all dated. */
function accountFixture(): Workspace {
  const data = comparisonFixture();
  const contract = data.tariffs.find((t) => t.id === data.currentId)!;
  data.currentSince = "2026-01-01";
  data.history = [
    {
      id: crypto.randomUUID(),
      start: "2025-01-01",
      end: "2026-01-01",
      tariff: {
        ...contract,
        id: crypto.randomUUID(),
        name: "Contrato anterior",
        energyPeak: "0.24",
      },
    },
  ];
  const bill = billFromCalculation(
    contract,
    data.profile,
    calculate(contract, data.profile)!,
  );
  data.bills = [
    ["2025-06", "2025-06-01", "2025-07-01"],
    ["2025-07", "2025-07-01", "2025-08-01"],
    ["2026-06", "2026-06-01", "2026-07-01"],
    ["2026-07", "2026-07-01", "2026-08-01"],
    ["2026-08", "2026-08-01", "2026-09-01"],
  ].map(([month, periodStart, periodEnd]) => ({
    ...bill,
    id: crypto.randomUUID(),
    month,
    periodStart,
    periodEnd,
  }));
  // A credit, drawn below zero.
  data.bills[3].credit = "8";
  data.bills[3].paid = (Number(bill.paid) - 8).toFixed(2);
  return data;
}

test("guest screens", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-09-22T12:00:00Z"));
  await page.goto("/");
  await shot(page, "guest-empty");
  await openComparison(page);
  await expect(
    page.getByRole("heading", { name: "Tu espacio de electricidad" }),
  ).toBeVisible();
  await shot(page, "guest-comparison");
  await page
    .getByRole("button", { name: "Editar perfil", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await dialog(page, "guest-profile");
  await page.reload();
  await page
    .getByRole("button", { name: "Simular consumo", exact: true })
    .click();
  await shot(page, "guest-simulation");
  await page.reload();
  await page
    .getByRole("button", { name: "Añadir tarifa", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await dialog(page, "guest-tariff-form");
  await page.goto("/cuenta");
  await shot(page, "sign-in");
  await page.goto("/privacidad");
  await shot(page, "privacy");
});

test("finalists", async ({ page }) => {
  test.skip(
    test.info().project.name === "phone",
    "Cards choose finalists differently on a phone.",
  );
  await openComparison(page);
  const table = page.getByRole("table", {
    name: "Comparativa de tarifas",
    exact: true,
  });
  await table
    .getByRole("checkbox", { name: "Comparar Clara Fija", exact: true })
    .check();
  await table
    .getByRole("checkbox", { name: "Comparar Luna Noche", exact: true })
    .check();
  await page
    .getByRole("button", { name: "Ver comparación (3)", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await dialog(page, "finalists");
});

test("account screens", async ({ page }) => {
  test.skip(
    !process.env.COMPARISON_TEST_DATABASE_URL,
    "Requires a disposable local account database.",
  );
  // A fixed address, so the account page looks the same on every run.
  const email = `visual-${test.info().project.name}@example.test`;
  const db = new Client({
    connectionString: process.env.COMPARISON_TEST_DATABASE_URL,
  });
  await db.connect();
  await db.query('DELETE FROM "user" WHERE email = $1', [email]);
  await db.end();
  await page.clock.setFixedTime(new Date("2026-09-22T12:00:00Z"));
  await signUpVerified(page, "Visual", email, "visual-test-only-password");
  await seedWorkspace(email, accountFixture());
  await page.goto("/");
  // The save status is hidden on a phone; the saved tariffs show the data loaded.
  await expect(page.getByText("Casa 24h").first()).toBeVisible();
  await shot(page, "account-comparison");
  await page.getByRole("button", { name: "Mis tarifas", exact: true }).click();
  await expect(page.getByRole("article").first()).toBeVisible();
  await shot(page, "account-tariffs");
  await page.getByRole("button", { name: "Mis facturas", exact: true }).click();
  await expect(page.getByText("Cargando tus facturas…")).toHaveCount(0);
  await expect(page.getByRole("main")).toContainText("ago 2026");
  await drawn(page);
  await shot(page, "account-bills");
  const chart = page.getByRole("radiogroup", { name: "Tipo de gráfico" });
  await chart.getByRole("radio", { name: "Evolución" }).click();
  await drawn(page);
  await shot(page, "account-bills-lines");
  await chart.getByRole("radio", { name: "Consumo" }).click();
  await drawn(page);
  await shot(page, "account-bills-consumption");
  await page.getByRole("button", { name: "Por años", exact: true }).click();
  await drawn(page);
  await shot(page, "account-bills-years");
  await page.getByRole("button", { name: "Mes a mes", exact: true }).click();
  await page.getByRole("button", { name: "Comparador", exact: true }).click();
  await page
    .getByRole("button", {
      name: "Guardar este período como factura",
      exact: true,
    })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await dialog(page, "account-bill-form");
  await page.goto("/mi-cuenta");
  await shot(page, "account-settings");
});
