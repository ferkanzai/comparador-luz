import { Pool } from "pg";
import axe from "axe-core";
import type { Page } from "@playwright/test";
import { comparisonFixture } from "./comparison.fixture";
import { expect, test } from "./strict-test";
import { seedWorkspace, signUpVerified } from "./sign-up";
import { money, type Workspace } from "../../src/lib/domain";
import { calculate } from "../../src/lib/calculator";
import { billFromCalculation, billTotal } from "../../src/lib/bill-data";

test.beforeEach(async () => {
  const url = process.env.COMPARISON_TEST_DATABASE_URL;
  if (!url) return;
  // The Playwright configuration requires a disposable local *_test database.
  const pool = new Pool({ connectionString: url });
  try {
    await pool.query('DELETE FROM "rateLimit"');
  } finally {
    await pool.end();
  }
});

test("edits optional expiry without losing legacy review dates or requiring a personal review", async ({
  page,
}) => {
  const data = comparisonFixture();
  data.tariffs[1].checkedOn = "2025-12-01";
  await openTariffs(page, data);
  await page.getByRole("button", { name: "Comparador", exact: true }).click();
  const table = page.getByRole("table", {
    name: "Comparativa de tarifas",
    exact: true,
  });
  await table
    .getByRole("button", { name: "Editar Clara Fija", exact: true })
    .click();
  const form = page.getByRole("dialog");
  await expect(
    form.getByLabel("Oferta válida hasta", { exact: true }),
  ).not.toBeVisible();
  await expect(
    form.getByText("Última revisión por ti", { exact: false }),
  ).toHaveCount(0);
  await form.getByText("Validez y condiciones", { exact: true }).click();
  await expect(form).toContainText("No es la fecha de fin de tu contrato");
  await form
    .getByLabel("Oferta válida hasta", { exact: true })
    .fill("2026-09-22");
  await form
    .getByRole("button", { name: "Aplicar tarifa", exact: true })
    .click();
  const candidate = table.getByRole("row").filter({ hasText: "Clara Fija" });
  await expect(candidate).toContainText("Oferta válida hasta · 22 sept 2026");
  await expect(candidate).toContainText("80,35");
  await expect(
    page.getByText("Guardado en tu cuenta", { exact: true }),
  ).toBeVisible();
  const saved = await page.request.get("/api/workspace");
  expect(
    (await saved.json()).data.tariffs.find(
      (t: { id: string }) => t.id === data.tariffs[1].id,
    ).checkedOn,
  ).toBe("2025-12-01");
  for (const date of ["2026-09-21", ""]) {
    await table
      .getByRole("button", { name: "Editar Clara Fija", exact: true })
      .click();
    await form.getByText("Validez y condiciones", { exact: true }).click();
    await form.getByLabel("Oferta válida hasta", { exact: true }).fill(date);
    await form
      .getByRole("button", { name: "Aplicar tarifa", exact: true })
      .click();
    if (date) await expect(candidate).toContainText("Caducada · 21 sept 2026");
    else {
      await expect(candidate).toContainText("80,35");
      await expect(candidate).not.toContainText("Caducada");
    }
  }
});

async function openTariffs(page: Page, data: Workspace = comparisonFixture()) {
  test.skip(
    !process.env.COMPARISON_TEST_DATABASE_URL,
    "Requires disposable local account database.",
  );
  await page.clock.setFixedTime(new Date("2026-09-22T12:00:00Z"));
  const email = `tariffs-${crypto.randomUUID()}@example.test`;
  await signUpVerified(
    page,
    "Tariff test",
    email,
    "local-tariff-test-password",
  );
  await seedWorkspace(email, data);
  await page.goto("/");
  await page.getByRole("button", { name: "Mis tarifas", exact: true }).click();
}

test("adds historical terms directly and persists them without changing the current contract", async ({
  page,
}) => {
  await openTariffs(page);
  await expect(
    page.getByRole("button", { name: "Añadir tarifa anterior", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Añadir tarifa anterior", exact: true })
    .click();
  const form = page.getByRole("dialog");
  await form
    .getByLabel("Nombre de la tarifa", { exact: true })
    .fill("Contrato 2025");
  await form.getByLabel("Fecha de inicio", { exact: true }).fill("2025-01-01");
  await form.getByLabel("Fecha de fin", { exact: true }).fill("2026-01-01");
  await form.getByRole("button", { name: "Precio único", exact: true }).click();
  await form.getByLabel("Precio las 24 horas", { exact: true }).fill("0.25");
  await form.getByLabel("P1 · Punta", { exact: true }).fill("0.08");
  await form.getByLabel("P2 · Valle", { exact: true }).fill("0.02");
  await form
    .getByRole("button", { name: "Guardar período", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Contrato 2025", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Casa 24h", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Guardado en tu cuenta", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Mis tarifas", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Contrato 2025", exact: true }),
  ).toBeVisible();
});

test("optionally compares three recorded tariffs using common power units on a phone", async ({
  page,
}) => {
  const data = comparisonFixture();
  data.history = [
    {
      id: crypto.randomUUID(),
      start: "2025-01-01",
      end: "2026-01-01",
      tariff: {
        ...data.tariffs[0],
        name: "Anual",
        powerUnit: "year",
        powerPeak: "29.2",
        powerValley: "7.3",
      },
    },
    {
      id: crypto.randomUUID(),
      start: "2024-01-01",
      end: "2025-01-01",
      tariff: {
        ...data.tariffs[0],
        name: "Combinada",
        powerUnit: "month",
        powerKind: "combined",
        powerPeak: "3",
        powerValley: "",
      },
    },
  ];
  await page.setViewportSize({ width: 390, height: 844 });
  await openTariffs(page, data);
  await expect(
    page.getByRole("button", { name: "Comparar precios", exact: true }),
  ).toBeVisible();
  const table = page.getByRole("table", {
    name: "Precios de tus tarifas",
    exact: true,
  });
  await expect(table).toHaveCount(0);
  await page
    .getByRole("button", { name: "Comparar precios", exact: true })
    .click();
  await expect(table).toContainText("Casa 24h");
  await expect(table).toContainText("Anual");
  await page.getByRole("checkbox", { name: /Comparar Combinada/ }).check();
  await page
    .getByLabel("Comparar potencia en", { exact: true })
    .selectOption("month");
  const power = table.getByRole("row").filter({
    has: page.getByRole("rowheader", { name: "Potencia", exact: true }),
  });
  await expect(power).toContainText("3 €/kW/mes");
  await expect(power.getByRole("cell")).toHaveCount(3);
  for (const cell of await power.getByRole("cell").all())
    await expect(cell).toContainText("3 €/kW/mes");
  await expect(table).not.toContainText("Total del período");
  await page.getByRole("checkbox", { name: /Comparar Casa 24h/ }).uncheck();
  await expect(table).not.toContainText("Casa 24h");
  await expect(page.getByRole("article").first()).toContainText(
    "Tu tarifa actual",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await page.addScriptTag({ content: axe.source });
  const accessibility = await page.evaluate(() =>
    (window as typeof window & { axe: typeof axe }).axe.run(
      document.querySelector("main")!,
      {
        runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] },
      },
    ),
  );
  expect(accessibility.violations).toEqual([]);
});

test("removes current and historical records only after confirmation without reactivation", async ({
  page,
}) => {
  const data = comparisonFixture();
  data.history = [
    {
      id: crypto.randomUUID(),
      start: "2025-01-01",
      end: "2026-01-01",
      tariff: { ...data.tariffs[0], name: "Anterior" },
    },
  ];
  await openTariffs(page, data);
  await expect(
    page.getByRole("button", {
      name: "Eliminar registro de Casa 24h",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Eliminar registro de Casa 24h", exact: true })
    .click();
  const confirmation = page.getByRole("dialog", {
    name: "Eliminar registro",
    exact: true,
  });
  await expect(confirmation).toContainText("sin tarifa actual");
  await expect(confirmation).toContainText("Casa 24h");
  await expect(
    confirmation.getByRole("button", { name: "Cancelar", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(confirmation).toHaveCount(0);
  await expect(page.getByRole("article")).toHaveCount(2);
  await page
    .getByRole("button", { name: "Eliminar registro de Casa 24h", exact: true })
    .click();
  await page.keyboard.press("Tab");
  await expect(
    confirmation.getByRole("button", {
      name: "Eliminar registro",
      exact: true,
    }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("article")).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "Registrar tarifa actual", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Comparador", exact: true }).click();
  await expect(
    page.getByRole("table", { name: "Comparativa de tarifas", exact: true }),
  ).toContainText("Sin tarifa de referencia");
  await page.getByRole("button", { name: "Mis tarifas", exact: true }).click();
  await page
    .getByRole("button", { name: "Eliminar registro de Anterior", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Eliminar registro", exact: true })
    .click();
  await expect(page.getByRole("article")).toHaveCount(0);
});

test("deletes a bill only after keyboard confirmation and shows what it removes", async ({
  page,
}) => {
  const data = comparisonFixture();
  const contract = data.tariffs[0];
  const cost = calculate(contract, data.profile)!;
  const bill = (month: string, periodStart: string, periodEnd: string) => ({
    ...billFromCalculation(contract, data.profile, cost),
    month,
    periodStart,
    periodEnd,
  });
  const march = bill("2026-03", "2026-02-01", "2026-03-03");
  const april = bill("2026-04", "2026-03-03", "2026-04-02");
  data.bills = [march, april];
  await openTariffs(page, data);
  await page.getByRole("button", { name: "Mis facturas", exact: true }).click();
  const remove = page.getByRole("button", {
    name: "Eliminar factura 2026-03",
    exact: true,
  });
  const confirmation = page.getByRole("dialog", {
    name: "Eliminar factura",
    exact: true,
  });
  await remove.click();
  await expect(confirmation).toContainText("Marzo 2026");
  await expect(confirmation).toContainText("Compañía actual");
  await expect(confirmation).toContainText(money(billTotal(march)));
  await expect(confirmation).toContainText("resto de facturas se conservan");
  await expect(
    confirmation.getByRole("button", { name: "Cancelar", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(confirmation).toHaveCount(0);
  await remove.click();
  await page.keyboard.press("Enter");
  await expect(confirmation).toHaveCount(0);
  await expect(remove).toBeVisible();
  await remove.click();
  await page.keyboard.press("Tab");
  await expect(
    confirmation.getByRole("button", { name: "Eliminar factura", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(remove).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Eliminar factura 2026-04", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Guardado en tu cuenta", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Mis facturas", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Eliminar factura 2026-04", exact: true }),
  ).toBeVisible();
  await expect(remove).toHaveCount(0);
});

test("lists bills as cards on a phone and signals when the monthly chart scrolls", async ({
  page,
}) => {
  const data = comparisonFixture();
  const contract = data.tariffs[0];
  const cost = calculate(contract, data.profile)!;
  const base = billFromCalculation(contract, data.profile, cost);
  data.bills = [
    { ...base, id: crypto.randomUUID(), month: "2026-03" },
    {
      ...base,
      id: crypto.randomUUID(),
      month: "2026-04",
      credit: "5",
      paid: (Number(base.paid) - 5).toFixed(2),
    },
  ];
  const april = data.bills[1];
  await page.setViewportSize({ width: 390, height: 844 });
  await openTariffs(page, data);
  await page.getByRole("button", { name: "Mis facturas", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Facturas registradas", exact: true }),
  ).toHaveCount(0);
  const cards = page
    .getByRole("list", { name: "Facturas registradas", exact: true })
    .getByRole("article");
  await expect(cards).toHaveCount(2);
  const card = cards.first();
  await expect(card).toHaveAccessibleName("Factura de Abril 2026");
  await expect(card).toContainText("Compañía actual");
  await expect(card).toContainText(
    `Total antes de descuentos${money(Number(base.paid))}`,
  );
  await expect(card).toContainText(`Descuentos${money(-5)}`);
  await expect(card).toContainText(`Pagado${money(Number(april.paid))}`);
  await expect(
    card.getByRole("button", { name: "Eliminar factura 2026-04", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Desliza el gráfico para ver todos los meses ↔"),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await card
    .getByRole("button", { name: "Editar factura 2026-04", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");

  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(
    page.getByRole("region", { name: "Facturas registradas", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("list", { name: "Facturas registradas", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText("Desliza el gráfico para ver todos los meses ↔"),
  ).toHaveCount(0);
});

test("records a candidate as history and edits a comparison copy without changing the period", async ({
  page,
}) => {
  await openTariffs(page);
  await page.getByRole("button", { name: "Comparador", exact: true }).click();
  await page.getByRole("button", { name: "Clara Fija", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Registrar como anterior", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Registrar como anterior", exact: true })
    .click();
  let form = page.getByRole("dialog");
  await form.getByLabel("Fecha de inicio", { exact: true }).fill("2025-01-01");
  await form.getByLabel("Fecha de fin", { exact: true }).fill("2026-01-01");
  await form
    .getByRole("button", { name: "Guardar período", exact: true })
    .click();
  await page.getByRole("button", { name: "Mis tarifas", exact: true }).click();
  const history = page.getByRole("article").filter({ hasText: "Clara Fija" });
  await history
    .getByRole("button", { name: "Volver a comparar", exact: true })
    .click();
  const table = page.getByRole("table", {
    name: "Comparativa de tarifas",
    exact: true,
  });
  await table
    .getByRole("button", { name: "Editar Clara Fija", exact: true })
    .last()
    .click();
  form = page.getByRole("dialog");
  await form
    .getByLabel("Nombre de la tarifa", { exact: true })
    .fill("Experimento");
  await form.getByLabel("Precio las 24 horas", { exact: true }).fill("0.1");
  await form
    .getByRole("button", { name: "Aplicar tarifa", exact: true })
    .click();
  await page.getByRole("button", { name: "Mis tarifas", exact: true }).click();
  await expect(history).toContainText("0,14");
  await expect(history).not.toContainText("Experimento");
});

test("corrects a shared change date with a preview and no additional history", async ({
  page,
}) => {
  const data = comparisonFixture();
  data.history = [
    {
      id: crypto.randomUUID(),
      start: "2025-01-01",
      end: "2026-01-01",
      tariff: { ...data.tariffs[0], name: "Anterior" },
    },
  ];
  data.bills = [
    {
      id: crypto.randomUUID(),
      month: "2026-01",
      periodStart: "2026-01-01",
      periodEnd: "2026-02-01",
      provider: "Supplier",
      paid: "100",
      credit: "0",
      kwh: "500",
      notes: "",
      tariff: structuredClone(data.tariffs[0]),
      profile: null,
      breakdown: null,
    },
  ];
  await openTariffs(page, data);
  await expect(
    page.getByRole("button", {
      name: "Corregir datos de Casa 24h",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Corregir datos de Casa 24h", exact: true })
    .click();
  const form = page.getByRole("dialog");
  await form
    .getByLabel("Nombre de la tarifa", { exact: true })
    .fill("Casa corregida");
  await form.getByLabel("Precio las 24 horas", { exact: true }).fill("0.17");
  await form.getByLabel("Fecha de inicio", { exact: true }).fill("2026-01-05");
  await form
    .getByLabel("Ajustar también los períodos contiguos", { exact: true })
    .check();
  await expect(
    form.getByRole("region", { name: "Vista previa de fechas" }),
  ).toContainText("5 ene 2026");
  await expect(
    form.getByRole("region", { name: "Vista previa de fechas" }),
  ).toContainText("Anterior");
  await form
    .getByRole("button", { name: "Guardar período", exact: true })
    .click();
  await expect(page.getByRole("article")).toHaveCount(2);
  await expect(page.getByRole("article").last()).toContainText("5 ene 2026");
  await expect(
    page.getByRole("heading", { name: "Casa corregida", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Guardado en tu cuenta", { exact: true }),
  ).toBeVisible();
  const saved = await page.request.get("/api/workspace");
  const restored = (await saved.json()).data as Workspace;
  expect(restored.bills).toEqual(data.bills);
  expect(restored.currentSince).toBe("2026-01-05");
  expect(restored.history[0].end).toBe("2026-01-05");
  await page.reload();
  await page.getByRole("button", { name: "Mis tarifas", exact: true }).click();
  await expect(page.getByRole("article").last()).toContainText("5 ene 2026");
});

test("registers a real price change in Mis tarifas and preserves the old period", async ({
  page,
}) => {
  await openTariffs(page);
  await expect(
    page.getByRole("button", {
      name: "Registrar cambio de precios",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Registrar cambio de precios", exact: true })
    .click();
  const form = page.getByRole("dialog");
  await form.getByLabel("Fecha de inicio", { exact: true }).fill("2026-06-01");
  await form.getByLabel("Precio las 24 horas", { exact: true }).fill("0.15");
  await form
    .getByRole("button", { name: "Guardar período", exact: true })
    .click();
  await expect(page.getByRole("article")).toHaveCount(2);
  await expect(page.getByRole("article").first()).toContainText("0,15");
  await expect(page.getByRole("article").last()).toContainText("0,20");
  await page.getByRole("button", { name: "Comparador", exact: true }).click();
  const table = page.getByRole("table", {
    name: "Comparativa de tarifas",
    exact: true,
  });
  await expect(
    table.getByRole("row").filter({ hasText: "Casa 24h" }),
  ).toHaveCount(1);
  await expect(
    table.getByRole("row").filter({ hasText: "Casa 24h" }),
  ).toContainText("85,35");
});

test("keeps conditional card content quiet and comparison selection stable", async ({
  page,
}) => {
  const data = comparisonFixture();
  data.history = [
    {
      id: crypto.randomUUID(),
      start: "2025-01-01",
      end: "2025-01-01",
      tariff: {
        ...data.tariffs[0],
        name: "Tarifa por revisar",
        kind: "periods",
        energyFlat: "0.113",
        energyValley: "0.081739130435",
        meterDay: "0.02663",
        meterEstimate: "single-2013",
        powerUnit: "year",
        powerPeak: "29.2",
        powerValley: "7.3",
      },
    },
    {
      id: crypto.randomUUID(),
      start: "2024-01-01",
      end: "2025-01-01",
      tariff: { ...data.tariffs[0], name: "Contrato anterior" },
    },
    {
      id: crypto.randomUUID(),
      start: "2023-01-01",
      end: "2024-01-01",
      tariff: { ...data.tariffs[0], name: "Primer contrato" },
    },
  ];
  await openTariffs(page, data);
  const cards = page.getByRole("article");
  const card = cards.filter({ hasText: "Tarifa por revisar" });
  const currentBox = (await cards.first().boundingBox())!;
  const previousBox = (await card.boundingBox())!;
  expect(Math.abs(currentBox.height - previousBox.height)).toBeLessThan(1);
  await expect(
    card.getByText("0,081739", { exact: false }).first(),
  ).toBeVisible();
  await expect(
    card.getByText("La fecha final debe ser posterior al inicio."),
  ).not.toBeVisible();
  const warning = card.getByText("Revisar fechas", { exact: true });
  await warning.focus();
  await page.keyboard.press("Enter");
  await expect(
    card.getByText("La fecha final debe ser posterior al inicio."),
  ).toBeVisible();
  expect((await card.boundingBox())!.height).toBe(previousBox.height);
  await page.keyboard.press("Escape");
  await expect(
    card.getByText("La fecha final debe ser posterior al inicio."),
  ).not.toBeVisible();
  await expect(card.getByText("Incluye estimaciones")).toBeVisible();
  await expect(card.getByText(/Cálculo aproximado/)).not.toBeVisible();
  await card.getByText("Potencia y otros cargos", { exact: false }).click();
  await expect(card.getByText(/Cálculo aproximado/)).toBeVisible();
  await expect(
    card.getByText("0,081739130435", { exact: false }),
  ).toBeVisible();
  expect(
    Math.abs(
      (await cards.first().boundingBox())!.height -
        (await card.boundingBox())!.height,
    ),
  ).toBeLessThan(1);
  await page
    .getByRole("button", { name: "Comparar precios", exact: true })
    .click();
  const selection = page.getByRole("group", {
    name: "Períodos que quieres comparar",
  });
  const selectorBox = (await selection.boundingBox())!;
  const positions = await selection
    .getByRole("checkbox")
    .evaluateAll((inputs) =>
      inputs.map((input) => input.getBoundingClientRect().top),
    );
  expect(Math.max(...positions) - Math.min(...positions)).toBeLessThan(1);
  await selection
    .getByRole("checkbox", { name: /Comparar Contrato anterior/ })
    .check();
  expect((await selection.boundingBox())!.width).toBe(selectorBox.width);
  const table = page.getByRole("table", {
    name: "Precios de tus tarifas",
    exact: true,
  });
  const power = table.getByRole("row").filter({
    has: page.getByRole("rowheader", { name: "Potencia", exact: true }),
  });
  await expect(power.getByRole("cell").nth(1)).toContainText(
    "Original: P1 29,2 · P2 7,3 €/kW/año",
  );
  await expect(
    page.getByText("Ver precios originales de potencia"),
  ).toHaveCount(0);
  const saved = await page.request.get("/api/workspace");
  expect((await saved.json()).data.history[0].tariff.energyValley).toBe(
    "0.081739130435",
  );
});
