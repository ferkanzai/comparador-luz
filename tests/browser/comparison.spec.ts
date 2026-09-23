import axe from "axe-core";
import type { Page } from "@playwright/test";
import { comparisonFixture, openComparison } from "./comparison.fixture";
import { expect, test } from "./strict-test";
import { signUpVerified } from "./sign-up";

async function enterConsumption(
  page: Page,
  punta: string,
  llano: string,
  valle: string,
) {
  await page.getByLabel("Punta simulado", { exact: true }).fill(punta);
  await page.getByLabel("Llano simulado", { exact: true }).fill(llano);
  await page.getByLabel("Valle simulado", { exact: true }).fill(valle);
}

test("compares eight tariffs in one table with costs, rates and honest exclusions", async ({
  page,
}) => {
  await openComparison(page);
  const table = page.getByRole("table", {
    name: "Comparativa de tarifas",
    exact: true,
  });
  await expect(table).toBeVisible();
  await expect(table.getByRole("row")).toHaveCount(9);
  const current = table.getByRole("row").filter({ hasText: "Casa 24h" });
  await expect(current).toContainText("110,35");
  await expect(current).toContainText("100,00");
  await expect(current).toContainText("10,35");
  await expect(current).toContainText("0,20");
  await expect(current).toContainText("Tu tarifa actual");
  const cheapest = table.getByRole("row").nth(1);
  await expect(cheapest).toContainText("Clara Fija");
  await expect(cheapest).toContainText("80,35");
  await expect(cheapest).toContainText("Ahorras 30,00");
  await expect(
    table.getByRole("row").filter({ hasText: "Oferta caducada" }),
  ).toContainText("Fuera de comparativa");
  await expect(
    table.getByRole("row").filter({ hasText: "Por completar" }),
  ).toContainText("Completa los precios");
  await expect(
    page.getByText("Precios aún sin comprobar", { exact: true }),
  ).toHaveCount(0);
});

test("simulates total and distribution for every tariff, resets and explicitly adopts", async ({
  page,
}) => {
  await openComparison(page);
  await page
    .getByRole("button", { name: "Simular consumo", exact: true })
    .click();
  await enterConsumption(page, "120", "180", "300");
  await expect(
    page.getByLabel("Consumo total simulado", { exact: true }),
  ).toHaveText("600 kWh");
  const table = page.getByRole("table", {
    name: "Comparativa de tarifas",
    exact: true,
  });
  await expect(
    table.getByRole("row").filter({ hasText: "Casa 24h" }),
  ).toContainText("130,35");
  await page.getByLabel("Llano simulado", { exact: true }).fill("120");
  await page.getByLabel("Valle simulado", { exact: true }).fill("360");
  await expect(
    page.getByLabel("Consumo total simulado", { exact: true }),
  ).toHaveText("600 kWh");
  await expect(
    table.getByRole("row").filter({ hasText: "Luna Noche" }),
  ).toContainText("99,15");
  await page.getByRole("button", { name: "Restablecer", exact: true }).click();
  await expect(
    table.getByRole("row").filter({ hasText: "Casa 24h" }),
  ).toContainText("110,35");
  await enterConsumption(page, "120", "180", "300");
  await page.reload();
  await expect(
    table.getByRole("row").filter({ hasText: "Casa 24h" }),
  ).toContainText("110,35");
  await page
    .getByRole("button", { name: "Simular consumo", exact: true })
    .click();
  await enterConsumption(page, "120", "180", "300");
  await page
    .getByRole("button", { name: "Usar este consumo", exact: true })
    .click();
  await page.reload();
  await expect(
    table.getByRole("row").filter({ hasText: "Casa 24h" }),
  ).toContainText("130,35");
  await page
    .getByRole("button", { name: "Editar perfil", exact: true })
    .click();
  await expect(
    page.getByLabel("Consumo P1 · Punta", { exact: true }),
  ).toHaveValue("120");
  await expect(
    page.getByLabel("Consumo P2 · Llano", { exact: true }),
  ).toHaveValue("180");
  await expect(
    page.getByLabel("Consumo P3 · Valle", { exact: true }),
  ).toHaveValue("300");
});

test("compares selected finalists without changing the contract and keeps selection through reranking", async ({
  page,
}) => {
  await openComparison(page);
  const table = page.getByRole("table", {
    name: "Comparativa de tarifas",
    exact: true,
  });
  await expect(
    table.getByRole("checkbox", { name: "Comparar Casa 24h", exact: true }),
  ).toBeChecked();
  await table
    .getByRole("checkbox", { name: "Comparar Clara Fija", exact: true })
    .check();
  await table
    .getByRole("checkbox", { name: "Comparar Luna Noche", exact: true })
    .check();
  await expect(
    table.getByRole("checkbox", { name: "Comparar Brisa Anual", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Ver comparación (3)", exact: true })
    .click();
  const finalists = page.getByRole("table", {
    name: "Comparación de finalistas",
    exact: true,
  });
  await expect(finalists).toContainText("110,35");
  await expect(finalists).toContainText("80,35");
  await expect(finalists).toContainText("90,35");
  await page.getByRole("button", { name: "Cerrar", exact: true }).click();
  await table
    .getByRole("checkbox", { name: "Comparar Casa 24h", exact: true })
    .uncheck();
  await page
    .getByRole("button", { name: "Simular consumo", exact: true })
    .click();
  await page.getByLabel("Punta simulado", { exact: true }).fill("50");
  await page.getByLabel("Llano simulado", { exact: true }).fill("50");
  await page.getByLabel("Valle simulado", { exact: true }).fill("400");
  await expect(table.getByRole("row").nth(1)).toContainText("Luna Noche");
  await expect(table.getByRole("row").nth(1)).toContainText("67,35");
  await expect(
    table.getByRole("checkbox", { name: "Comparar Casa 24h", exact: true }),
  ).not.toBeChecked();
  await expect(
    table.getByRole("row").filter({ hasText: "Casa 24h" }),
  ).toContainText("Tu tarifa actual");
  await page
    .getByRole("button", { name: "Ver comparación (2)", exact: true })
    .click();
  await expect(finalists).toContainText("67,35");
  await expect(finalists).not.toContainText("Casa 24h");
});

test("keeps an experiment out of tariff edits and preserves other profile changes when adopted", async ({
  page,
}) => {
  await openComparison(page);
  await page
    .getByRole("button", { name: "Simular consumo", exact: true })
    .click();
  await enterConsumption(page, "120", "180", "300");
  await page
    .getByRole("button", { name: "Editar Clara Fija", exact: true })
    .click();
  await expect(
    page.getByLabel("Consumo P1 · Punta", { exact: true }),
  ).toHaveValue("100");
  await page
    .getByLabel("Nombre de la tarifa", { exact: true })
    .fill("Clara Editada");
  await page
    .getByRole("button", { name: "Aplicar tarifa", exact: true })
    .click();
  await page.reload();
  const table = page.getByRole("table", {
    name: "Comparativa de tarifas",
    exact: true,
  });
  await expect(
    table.getByRole("row").filter({ hasText: "Clara Editada" }),
  ).toContainText("80,35");
  await page
    .getByRole("button", { name: "Simular consumo", exact: true })
    .click();
  await enterConsumption(page, "120", "180", "300");
  await page
    .getByRole("button", { name: "Editar perfil", exact: true })
    .click();
  await page.getByLabel("Días del período", { exact: true }).fill("31");
  await page
    .getByRole("button", { name: "Volver a la comparativa", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Usar este consumo", exact: true })
    .click();
  await page.reload();
  await expect(
    table.getByRole("row").filter({ hasText: "Clara Editada" }),
  ).toContainText("94,70");
  await page
    .getByRole("button", { name: "Editar perfil", exact: true })
    .click();
  await expect(
    page.getByLabel("Días del período", { exact: true }),
  ).toHaveValue("31");
});

test("accepts invoice kWh, distinguishes missing values from zero and withholds invalid results", async ({
  page,
}) => {
  const data = comparisonFixture();
  Object.assign(data.profile, { peakKwh: "0", flatKwh: "0", valleyKwh: "0" });
  await openComparison(page, data);
  await page
    .getByRole("button", { name: "Simular consumo", exact: true })
    .click();
  const total = page.getByLabel("Consumo total simulado", { exact: true });
  await expect(total).toHaveText("0 kWh");
  await page.getByLabel("Valle simulado", { exact: true }).fill("100,5");
  await expect(total).toHaveText("100,5 kWh");
  const table = page.getByRole("table", {
    name: "Comparativa de tarifas",
    exact: true,
  });
  await expect(
    table.getByRole("row").filter({ hasText: "Luna Noche" }),
  ).toContainText("18,39");
  for (const invalid of ["", "-1", "1000001"]) {
    await page.getByLabel("Punta simulado", { exact: true }).fill(invalid);
    await expect(
      page.getByRole("button", { name: "Usar este consumo", exact: true }),
    ).toBeDisabled();
    await expect(total).toHaveText("— kWh");
    await expect(table).not.toContainText("Menor coste");
  }
  await page.getByRole("button", { name: "Restablecer", exact: true }).click();
  await expect(
    table.getByRole("row").filter({ hasText: "Luna Noche" }),
  ).toContainText("10,35");
});

test("account autosave isolates simulations, reports failures and resets transient state on account replacement", async ({
  page,
}) => {
  test.skip(
    !process.env.COMPARISON_TEST_DATABASE_URL,
    "Requires a server configured with a disposable local test database and console email.",
  );
  await signUpVerified(
    page,
    "Browser test",
    `comparison-${crypto.randomUUID()}@example.test`,
    "comparison-test-only-password",
  );
  const data = comparisonFixture();
  data.history = [
    {
      id: crypto.randomUUID(),
      start: "2025-01-01",
      end: "2026-01-01",
      tariff: {
        ...data.tariffs[0],
        name: "Contrato anterior",
        energyPeak: "0.25",
      },
    },
  ];
  const saved = await page.request.put("/api/workspace", {
    headers: { origin: "http://localhost:3000" },
    data: { data, version: 0 },
  });
  expect(saved.ok()).toBeTruthy();
  const initialWorkspaceReads: string[] = [];
  page.on("request", (request) => {
    if (
      new URL(request.url()).pathname === "/api/workspace" &&
      request.method() === "GET"
    )
      initialWorkspaceReads.push(request.url());
  });
  await page.goto("/");
  const table = page.getByRole("table", {
    name: "Comparativa de tarifas",
    exact: true,
  });
  await expect(table).toBeVisible();
  // Saved comparisons arrive in the page stream, without a post-hydration GET.
  expect(initialWorkspaceReads).toHaveLength(0);
  await expect(
    page.getByRole("heading", { name: /Que tu próxima factura/ }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", {
      name: "Tu espacio de electricidad",
      exact: true,
    }),
  ).toHaveCount(1);
  await page
    .getByRole("checkbox", { name: "Comparar Casa 24h", exact: true })
    .uncheck();
  await page
    .getByRole("checkbox", { name: "Comparar Clara Fija", exact: true })
    .check();
  await page.getByRole("button", { name: "Mis tarifas", exact: true }).click();
  await expect(
    page.getByRole("article").filter({ hasText: "Contrato anterior" }),
  ).toHaveCount(1);
  await expect(
    page.getByRole("article").filter({ hasText: "Contrato anterior" }),
  ).toContainText("Contrato anterior");
  await expect(
    page.getByRole("article").filter({ hasText: "Contrato anterior" }),
  ).toContainText("0,25 €/kWh");
  await expect(
    page.getByRole("heading", { name: "Casa 24h", exact: true }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Mis tarifas", exact: true }).click();
  await expect(
    page.getByRole("article").filter({ hasText: "Contrato anterior" }),
  ).toHaveCount(1);
  await expect(
    page.getByRole("article").filter({ hasText: "Contrato anterior" }),
  ).toContainText("Contrato anterior");
  expect(initialWorkspaceReads).toHaveLength(0);
  await page.getByRole("button", { name: "Comparador", exact: true }).click();
  await page
    .getByRole("button", { name: "Simular consumo", exact: true })
    .click();
  await enterConsumption(page, "120", "180", "300");
  await expect(
    page.getByRole("button", {
      name: "Guardar este período como factura",
      exact: true,
    }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Restablecer", exact: true }).click();
  await page
    .getByRole("button", {
      name: "Guardar este período como factura",
      exact: true,
    })
    .click();
  await expect(page.getByLabel("Total pagado", { exact: true })).toHaveValue(
    "110.35",
  );
  await page.getByRole("button", { name: "Cerrar", exact: true }).click();
  await enterConsumption(page, "120", "180", "300");
  await page
    .getByRole("button", { name: "Editar Clara Fija", exact: true })
    .click();
  await page
    .getByLabel("Nombre de la tarifa", { exact: true })
    .fill("Clara Guardada");
  await page
    .getByRole("button", { name: "Aplicar tarifa", exact: true })
    .click();
  await expect(
    page.getByText("Guardado en tu cuenta", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    table.getByRole("row").filter({ hasText: "Clara Guardada" }),
  ).toContainText("80,35");
  await page
    .getByRole("button", { name: "Simular consumo", exact: true })
    .click();
  await enterConsumption(page, "120", "180", "300");
  await page.route("**/api/workspace", async (route) => {
    if (route.request().method() === "PUT") await route.abort();
    else await route.continue();
  });
  await page
    .getByRole("button", { name: "Usar este consumo", exact: true })
    .click();
  await expect(page.getByText(/Guardado aquí · sin sincronizar/)).toBeVisible();
  await page.unroute("**/api/workspace");
  await page.getByRole("button", { name: "Reintentar", exact: true }).click();
  await expect(
    page.getByText("Guardado en tu cuenta", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    table.getByRole("row").filter({ hasText: "Clara Guardada" }),
  ).toContainText("94,35");
  await page.route("**/api/workspace", async (route) => {
    if (route.request().method() === "PUT")
      await route.fulfill({
        status: 409,
        contentType: "application/json",
        body: JSON.stringify({ error: "Cambios en otra pestaña" }),
      });
    else await route.continue();
  });
  await page
    .getByRole("button", { name: "Editar perfil", exact: true })
    .click();
  await page.getByLabel("Días del período", { exact: true }).fill("31");
  await page
    .getByRole("button", { name: "Volver a la comparativa", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Cargar versión de mi cuenta",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Simular consumo", exact: true })
    .click();
  await enterConsumption(page, "140", "210", "350");
  await table
    .getByRole("checkbox", { name: "Comparar Clara Guardada", exact: true })
    .check();
  await page.unroute("**/api/workspace");
  let releaseRead!: () => void;
  let startedRead!: () => void;
  const readPending = new Promise<void>((resolve) => {
    releaseRead = resolve;
  });
  const readStarted = new Promise<void>((resolve) => {
    startedRead = resolve;
  });
  await page.route("**/api/workspace", async (route) => {
    if (route.request().method() === "GET") {
      startedRead();
      await readPending;
    }
    await route.continue();
  });
  await page
    .getByRole("button", { name: "Cargar versión de mi cuenta", exact: true })
    .click();
  await readStarted;
  // An experiment made while the replacement is loading belongs to the old workspace.
  await page
    .getByRole("button", { name: "Simular consumo", exact: true })
    .click();
  await enterConsumption(page, "160", "240", "400");
  releaseRead();
  await expect(
    page.getByRole("region", { name: "Simulación de consumo", exact: true }),
  ).toHaveCount(0);
  await expect(
    table.getByRole("row").filter({ hasText: "Clara Guardada" }),
  ).toContainText("94,35");
  await expect(
    table.getByRole("checkbox", {
      name: "Comparar Clara Guardada",
      exact: true,
    }),
  ).not.toBeChecked();
  await page
    .getByRole("button", {
      name: "Guardar este período como factura",
      exact: true,
    })
    .click();
  await expect(page.getByLabel("Total pagado", { exact: true })).toHaveValue(
    "130.35",
  );
  await page
    .getByRole("button", { name: "Guardar factura", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByText("Guardado en tu cuenta", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Mis facturas", exact: true }).click();
  await expect(page.getByRole("main")).toContainText("130,35");
  await expect(page.getByRole("main")).toContainText("600");
});

test("shows one card per tariff on a phone, in ranking order, with selection and actions", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openComparison(page);
  await expect(
    page.getByRole("table", { name: "Comparativa de tarifas", exact: true }),
  ).toHaveCount(0);
  const cards = page
    .getByRole("list", { name: "Comparativa de tarifas", exact: true })
    .getByRole("article");
  await expect(cards).toHaveCount(8);
  await expect(cards.first()).toHaveAccessibleName("Clara Fija");
  await expect(cards.first()).toContainText("Menor coste");
  await expect(cards.last()).toHaveAccessibleName("Por completar");
  const clara = cards.first();
  await expect(clara).toContainText("80,35");
  await expect(clara).toContainText("Ahorras 30,00");
  await expect(clara).toContainText("Energía70,00 €");
  await expect(clara).toContainText("Potencia10,35 €");
  await expect(clara).toContainText("Otros cargos e impuestos0,00 €");
  const current = page.getByRole("article", { name: "Casa 24h", exact: true });
  await expect(current).toContainText("Tu tarifa actual");
  await expect(
    current.getByRole("button", { name: "Eliminar Casa 24h", exact: true }),
  ).toHaveCount(0);
  await expect(
    clara.getByRole("button", { name: "Eliminar Clara Fija", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  const select = clara.getByRole("checkbox", {
    name: "Comparar Clara Fija",
    exact: true,
  });
  await select.focus();
  await page.keyboard.press("Space");
  await expect(select).toBeChecked();
  await page
    .getByRole("button", { name: "Ver comparación (2)", exact: true })
    .click();
  await expect(
    page.getByRole("table", { name: "Comparación de finalistas", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await clara
    .getByRole("button", { name: "Ver desglose de Clara Fija", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("Desglose del período");
  await page.keyboard.press("Escape");
  await page.addScriptTag({ content: axe.source });
  const accessibility = await page.evaluate(() =>
    (window as typeof window & { axe: typeof axe }).axe.run(
      document.querySelector("main")!,
      { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] } },
    ),
  );
  expect(accessibility.violations).toEqual([]);
});
test("preserves normalized power units and shows optional offer expiry without personal review", async ({
  page,
}) => {
  await openComparison(page);
  const table = page.getByRole("table", {
    name: "Comparativa de tarifas",
    exact: true,
  });
  await page
    .getByLabel("Comparar potencia en", { exact: true })
    .selectOption("month");
  const current = table.getByRole("row").filter({ hasText: "Casa 24h" });
  await expect(current).toContainText("3 €/kW/mes");
  await expect(current).toContainText("0,08");
  await expect(current).toContainText("110,35");
  await page.reload();
  await expect(
    page.getByLabel("Comparar potencia en", { exact: true }),
  ).toHaveValue("month");
  await table.getByRole("button", { name: "Clara Fija", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByText("Última revisión por ti", { exact: false }),
  ).toHaveCount(0);
  await expect(
    dialog.getByRole("button", { name: "He revisado estos precios" }),
  ).toHaveCount(0);
  await expect(
    table.getByRole("row").filter({ hasText: "Oferta caducada" }),
  ).toContainText("Caducada · 1 ene 2026");
  await page.getByRole("button", { name: "Cerrar", exact: true }).click();
  await page.reload();
  await expect(
    table.getByRole("row").filter({ hasText: "Clara Fija" }),
  ).toContainText("80,35");
  await table.getByRole("button", { name: "Clara Fija", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toContainText(
    "Sin fecha registrada",
  );
});

test("supports empty profiles and missing consumption without inventing results", async ({
  page,
}) => {
  const data = comparisonFixture();
  data.currentId = null;
  data.currentSince = "";
  data.profile.peakKwh = "";
  await openComparison(page, data);
  const table = page.getByRole("table", {
    name: "Comparativa de tarifas",
    exact: true,
  });
  await expect(table).not.toContainText("Menor coste");
  await expect(table.getByRole("checkbox", { checked: true })).toHaveCount(0);
  await page
    .getByRole("button", { name: "Editar perfil", exact: true })
    .click();
  await page.getByLabel("Consumo P1 · Punta", { exact: true }).fill("0");
  await page
    .getByRole("button", { name: "Volver a la comparativa", exact: true })
    .click();
  await expect(
    table.getByRole("row").filter({ hasText: "Clara Fija" }),
  ).toContainText("66,35");
  await expect(
    table.getByRole("row").filter({ hasText: "Clara Fija" }),
  ).toContainText("Sin tarifa de referencia");
});

test("preserves tariff duplication, deletion and current-contract designation", async ({
  page,
}) => {
  await openComparison(page);
  const table = page.getByRole("table", {
    name: "Comparativa de tarifas",
    exact: true,
  });
  await table.getByRole("button", { name: "Clara Fija", exact: true }).click();
  await page.getByRole("button", { name: "Duplicar", exact: true }).click();
  await page.getByRole("button", { name: "Crear tarifa", exact: true }).click();
  await expect(table.getByRole("row")).toHaveCount(10);
  await table
    .getByRole("checkbox", { name: "Comparar Clara Fija (copia)", exact: true })
    .check();
  const remove = table.getByRole("button", {
    name: "Eliminar Clara Fija (copia)",
    exact: true,
  });
  await remove.click();
  const confirmation = page.getByRole("dialog", {
    name: "Eliminar tarifa",
    exact: true,
  });
  await expect(confirmation).toContainText("Clara Fija (copia)");
  await expect(
    confirmation.getByRole("button", { name: "Cancelar", exact: true }),
  ).toBeFocused();
  await confirmation
    .getByRole("button", { name: "Cancelar", exact: true })
    .click();
  await expect(table.getByRole("row")).toHaveCount(10);
  await remove.click();
  await page.keyboard.press("Escape");
  await expect(confirmation).toHaveCount(0);
  await expect(table.getByRole("row")).toHaveCount(10);
  await table
    .getByRole("button", { name: "Clara Fija (copia)", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Eliminar tarifa", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(1);
  await expect(confirmation).toContainText("Clara Fija (copia)");
  await page.keyboard.press("Tab");
  await expect(
    confirmation.getByRole("button", { name: "Eliminar tarifa", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(table.getByRole("row")).toHaveCount(9);
  await expect(
    page.getByRole("button", {
      name: "Quitar Clara Fija (copia) de finalistas",
      exact: true,
    }),
  ).toHaveCount(0);
  await table.getByRole("button", { name: "Clara Fija", exact: true }).click();
  await page
    .getByRole("button", { name: "Registrar como actual", exact: true })
    .click();
  await page.getByLabel("Fecha de inicio", { exact: true }).fill("2026-06-01");
  await page
    .getByRole("button", { name: "Guardar período", exact: true })
    .click();
  await expect(
    table.getByRole("row").filter({ hasText: "Clara Fija" }),
  ).toContainText("Tu tarifa actual");
  await page.reload();
  await expect(
    table.getByRole("row").filter({ hasText: "Casa 24h" }),
  ).toHaveCount(0);
});

test("stops adding and duplicating tariffs at the 100-tariff limit and explains why", async ({
  page,
}) => {
  const data = comparisonFixture();
  const offer = data.tariffs[1];
  data.tariffs.push(
    ...Array.from({ length: 99 - data.tariffs.length }, (_, i) => ({
      ...offer,
      id: crypto.randomUUID(),
      name: `Oferta ${i + 1}`,
    })),
  );
  await openComparison(page, data);
  const table = page.getByRole("table", {
    name: "Comparativa de tarifas",
    exact: true,
  });
  const add = page.getByRole("button", { name: "Añadir tarifa", exact: true });
  await expect(add).toBeEnabled();
  await table.getByRole("button", { name: "Clara Fija", exact: true }).click();
  await page.getByRole("button", { name: "Duplicar", exact: true }).click();
  await page.getByRole("button", { name: "Crear tarifa", exact: true }).click();
  await expect(table.getByRole("row")).toHaveCount(101);
  await expect(add).toBeDisabled();
  await expect(add).toHaveAccessibleDescription(/hasta 100 tarifas/);
  await table.getByRole("button", { name: "Clara Fija", exact: true }).click();
  const details = page.getByRole("dialog", { name: "Clara Fija", exact: true });
  const duplicate = details.getByRole("button", {
    name: "Duplicar",
    exact: true,
  });
  await expect(duplicate).toBeDisabled();
  await expect(duplicate).toHaveAccessibleDescription(/hasta 100 tarifas/);
  await details
    .getByRole("button", { name: "Eliminar tarifa", exact: true })
    .click();
  await page
    .getByRole("dialog", { name: "Eliminar tarifa", exact: true })
    .getByRole("button", { name: "Eliminar tarifa", exact: true })
    .click();
  await expect(table.getByRole("row")).toHaveCount(100);
  await expect(add).toBeEnabled();
  await expect(page.getByText(/hasta 100 tarifas/)).toHaveCount(0);
  await expect(page.locator(".workspace-status")).not.toContainText(
    "no se puede",
  );
});

test("retains the expired current tariff as baseline and excludes incompatible combined power", async ({
  page,
}) => {
  const data = comparisonFixture();
  data.tariffs[0].validUntil = "2026-01-01";
  data.profile.valleyKw = "5";
  await openComparison(page, data);
  const table = page.getByRole("table", {
    name: "Comparativa de tarifas",
    exact: true,
  });
  await expect(
    table.getByRole("row").filter({ hasText: "Casa 24h" }),
  ).toContainText("111,28");
  await expect(
    table.getByRole("row").filter({ hasText: "Sol Mensual" }),
  ).toContainText("Requiere la misma potencia");
  await expect(
    table.getByRole("row").filter({ hasText: "Clara Fija" }),
  ).toContainText("Ahorras 30,00");
  await expect(
    page.getByText(/La referencia de potencia no representa tu coste/),
  ).toBeVisible();
});

test("has accessible table, simulator and finalist interactions", async ({
  page,
}) => {
  await openComparison(page);
  await page
    .getByRole("button", { name: "Simular consumo", exact: true })
    .click();
  await enterConsumption(page, "120", "180", "300");
  await page.addScriptTag({ content: axe.source });
  const audit = () =>
    page.evaluate(async () => {
      const engine = (window as typeof window & { axe: typeof axe }).axe;
      return (
        await engine.run(document, {
          runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
        })
      ).violations.map((violation) => ({
        id: violation.id,
        nodes: violation.nodes.map((node) => node.html),
      }));
    });
  expect(await audit()).toEqual([]);
  await page
    .getByRole("checkbox", { name: "Comparar Clara Fija", exact: true })
    .check();
  await page
    .getByRole("button", { name: "Ver comparación (2)", exact: true })
    .click();
  expect(await audit()).toEqual([]);
});

test("shows tax-inclusive totals with pre-tax rates and a reconciling other-charges group", async ({
  page,
}) => {
  const data = comparisonFixture();
  data.profile.taxes = true;
  data.profile.vat = "21";
  data.profile.electricityTax = "5.11269632";
  await openComparison(page, data);
  const table = page.getByRole("table", {
    name: "Comparativa de tarifas",
    exact: true,
  });
  const assumptions = page.getByLabel("Impuestos de la comparación", {
    exact: true,
  });
  await expect(assumptions).toContainText("IVA 21 %");
  await expect(assumptions).toContainText("IEE 5,11269632 %");
  await expect(assumptions).toContainText("Mínimo IEE 0,001 €/kWh");
  await page
    .getByRole("checkbox", { name: "Comparar Clara Fija", exact: true })
    .check();
  await page
    .getByRole("button", { name: "Ver comparación (2)", exact: true })
    .click();
  await expect(
    page
      .getByRole("dialog")
      .getByLabel("Impuestos de la comparación", { exact: true }),
  ).toContainText("IVA 21 %");
  await page.getByRole("button", { name: "Cerrar", exact: true }).click();
  const row = table.getByRole("row").filter({ hasText: "Casa 24h" });
  await expect(row).toContainText("140,35");
  await expect(row).toContainText("30,00");
  await expect(row).toContainText("0,20");
  await row
    .getByRole("button", { name: "Ver desglose de Casa 24h", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("5,64");
  await expect(page.getByRole("dialog")).toContainText("24,36");
  await page.getByRole("button", { name: "Cerrar", exact: true }).click();
  await page
    .getByRole("button", { name: "Editar perfil", exact: true })
    .click();
  await page
    .getByRole("checkbox", {
      name: "Aplicar mínimo doméstico IEE (0,001 €/kWh)",
      exact: true,
    })
    .uncheck();
  await page
    .getByRole("button", { name: "Volver a la comparativa", exact: true })
    .click();
  await expect(assumptions).toContainText("Mínimo IEE desactivado");
});

test("starts with no sample tariffs and lets the first tariff be the current reference", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Añadir mi primera tarifa", exact: true })
    .click();
  await page
    .getByLabel("Nombre de la tarifa", { exact: true })
    .fill("Mi primera tarifa");
  await page.getByRole("button", { name: "Precio único", exact: true }).click();
  await page.getByLabel("Precio las 24 horas", { exact: true }).fill("0.20");
  await page.getByLabel("P1 · Punta", { exact: true }).fill("0.08");
  await page.getByLabel("P2 · Valle", { exact: true }).fill("0.02");
  await page.getByLabel("Fecha de inicio", { exact: true }).fill("2026-01-01");
  await page
    .getByRole("button", { name: "Aplicar tarifa", exact: true })
    .click();
  const table = page.getByRole("table", {
    name: "Comparativa de tarifas",
    exact: true,
  });
  await expect(table.getByRole("row")).toHaveCount(2);
  await expect(table).toContainText("Tu tarifa actual");
  await expect(table).not.toContainText("Menor coste");
  await expect(table).toContainText("Completa los precios");
});

test("shows every tariff at natural height on desktop with a header row that sticks to the page", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openComparison(page);
  const table = page.getByRole("table", {
    name: "Comparativa de tarifas",
    exact: true,
  });
  await expect(table.getByRole("row")).toHaveCount(9);
  await expect(
    page.getByRole("list", { name: "Comparativa de tarifas", exact: true }),
  ).toHaveCount(0);
  const frame = table.locator("..");
  expect(
    await frame.evaluate(
      (el) =>
        el.scrollHeight <= el.clientHeight && el.scrollWidth <= el.clientWidth,
    ),
  ).toBeTruthy();
  await expect(page.getByText(/Desliza dentro de la tabla/)).toHaveCount(0);
  const header = table.getByRole("columnheader").first();
  const last = table.getByRole("row").last();
  await last.scrollIntoViewIfNeeded();
  await page.mouse.wheel(0, 200);
  await expect
    .poll(async () => (await table.boundingBox())!.y)
    .toBeLessThan(-100);
  expect(Math.abs((await header.boundingBox())!.y)).toBeLessThan(2);
  await expect(last).toBeInViewport();
});

test("keeps finalist column headings visible while scrolling inside the dialog", async ({
  page,
}) => {
  await openComparison(page);
  await page
    .getByRole("checkbox", { name: "Comparar Clara Fija", exact: true })
    .check();
  await page
    .getByRole("button", { name: "Ver comparación (2)", exact: true })
    .click();
  const table = page.getByRole("table", {
    name: "Comparación de finalistas",
    exact: true,
  });
  const region = table.locator("..");
  await region.scrollIntoViewIfNeeded();
  const header = table.getByRole("columnheader").first();
  const before = await header.boundingBox();
  await region.evaluate((element) => {
    element.scrollTop = 350;
  });
  expect(await region.evaluate((element) => element.scrollTop)).toBeGreaterThan(
    100,
  );
  const after = await header.boundingBox();
  expect(Math.abs(after!.y - before!.y)).toBeLessThan(2);
});
test("conserves a rounding-sensitive total through simulation and adoption", async ({
  page,
}) => {
  const data = comparisonFixture();
  Object.assign(data.profile, { peakKwh: "1", flatKwh: "1", valleyKwh: "1" });
  await openComparison(page, data);
  await page
    .getByRole("button", { name: "Simular consumo", exact: true })
    .click();
  await enterConsumption(page, "0.336667", "0.336667", "0.336666");
  await expect(
    page.getByLabel("Consumo total simulado", { exact: true }),
  ).toHaveText("1,01 kWh");
  await page
    .getByRole("button", { name: "Usar este consumo", exact: true })
    .click();
  await page.reload();
  await page
    .getByRole("button", { name: "Editar perfil", exact: true })
    .click();
  const values = await Promise.all(
    ["P1 · Punta", "P2 · Llano", "P3 · Valle"].map((period) =>
      page.getByLabel(`Consumo ${period}`, { exact: true }).inputValue(),
    ),
  );
  expect(values).toEqual(["0.336667", "0.336667", "0.336666"]);
  expect(values.reduce((sum, value) => sum + Number(value), 0)).toBeCloseTo(
    1.01,
    6,
  );
});

test("hides zero charges in estimates and keeps a finalist row when any finalist pays it", async ({
  page,
}) => {
  await openComparison(page);
  await page
    .getByRole("button", { name: "Ver desglose de Casa 24h", exact: true })
    .click();
  const breakdown = page.getByRole("dialog").locator(".breakdown");
  await expect(breakdown).toContainText("Energía");
  await expect(breakdown).toContainText("Potencia");
  await expect(breakdown).not.toContainText("Alquiler de contador");
  await expect(breakdown).not.toContainText("IVA servicios");
  await page.getByRole("button", { name: "Cerrar", exact: true }).click();

  await page
    .getByRole("checkbox", { name: "Comparar Clara Fija", exact: true })
    .check();
  await page
    .getByRole("button", { name: "Ver comparación (2)", exact: true })
    .click();
  const finalists = page.getByRole("table", {
    name: "Comparación de finalistas",
    exact: true,
  });
  await expect(finalists).toContainText("Potencia");
  await expect(finalists).not.toContainText("Alquiler de contador");
  await page.getByRole("button", { name: "Cerrar", exact: true }).click();

  await page
    .getByRole("checkbox", { name: "Comparar Verde Completa", exact: true })
    .check();
  await page
    .getByRole("button", { name: "Ver comparación (3)", exact: true })
    .click();
  const meter = finalists.getByRole("row").filter({
    has: page.getByRole("rowheader", {
      name: "Alquiler de contador",
      exact: true,
    }),
  });
  await expect(meter.getByRole("cell")).toHaveCount(3);
  await expect(meter.getByRole("cell").first()).toContainText("0,00");
});

test("fits three finalists on desktop and audits the tariff breakdown contrast", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openComparison(page);
  await page
    .getByRole("checkbox", { name: "Comparar Clara Fija", exact: true })
    .check();
  await page
    .getByRole("checkbox", { name: "Comparar Luna Noche", exact: true })
    .check();
  await page
    .getByRole("button", { name: "Ver comparación (3)", exact: true })
    .click();
  const table = page.getByRole("table", {
    name: "Comparación de finalistas",
    exact: true,
  });
  expect(
    await table
      .locator("..")
      .evaluate((el) => el.scrollWidth <= el.clientWidth),
  ).toBeTruthy();
  await page.getByRole("button", { name: "Cerrar", exact: true }).click();
  await page
    .getByRole("button", { name: "Ver desglose de Casa 24h", exact: true })
    .click();
  await page.addScriptTag({ content: axe.source });
  const violations = await page.evaluate(async () => {
    const engine = (window as typeof window & { axe: typeof axe }).axe;
    return (
      await engine.run(document, {
        runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
      })
    ).violations.map((v) => v.id);
  });
  expect(violations).toEqual([]);
  const total = page.getByRole("dialog").locator(".breakdown .total");
  const selection = await total.evaluate((el) => ({
    color: getComputedStyle(el, "::selection").color,
    background: getComputedStyle(el, "::selection").backgroundColor,
  }));
  expect(selection.color).toBe("rgb(36, 61, 50)");
  expect(selection.background).toBe("rgb(215, 238, 135)");
});

test("keeps section navigation in a consistent position across all three tabs", async ({
  page,
}) => {
  await openComparison(page);
  const navigation = page.getByRole("navigation", {
    name: "Secciones del comparador",
  });
  for (const tab of [
    "Mis tarifas",
    "Mis facturas",
    "Comparador",
    "Mis facturas",
    "Mis tarifas",
    "Comparador",
  ]) {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await navigation.getByRole("button", { name: tab, exact: true }).click();
    await expect(
      navigation.getByRole("button", { name: tab, exact: true }),
    ).toHaveAttribute("aria-current", "page");
    await expect
      .poll(async () => Math.round((await navigation.boundingBox())!.y))
      .toBe(0);
  }
});

test("sends security headers and renders the account page under the policy", async ({
  page,
}) => {
  const response = await page.goto("/cuenta");
  const headers = response!.headers();
  expect(headers["content-security-policy"]).toContain("connect-src 'self'");
  expect(headers["content-security-policy"]).toContain(
    "frame-ancestors 'none'",
  );
  expect(headers["permissions-policy"]).toContain("camera=()");
  await expect(page.locator('input[type="email"]').first()).toBeVisible();
});

test("keeps account hints out of field names", async ({ page }) => {
  await page.goto("/cuenta?mode=signup");
  await page.getByRole("button", { name: "Contraseña", exact: true }).click();
  const password = page.getByLabel("Contraseña", { exact: true });
  await expect(password).toHaveAccessibleName("Contraseña");
  await expect(password).toHaveAccessibleDescription(
    "Al menos 12 caracteres. Puedes usar una frase.",
  );
});
