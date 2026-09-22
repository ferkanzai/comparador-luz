import { Pool } from "pg";
import axe from "axe-core";
import { expect, test, type Page } from "@playwright/test";
import { comparisonFixture } from "./comparison.fixture";
import type { Workspace } from "../../src/lib/domain";

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
  const signup = await page.request.post("/api/auth/sign-up/email", {
    headers: { origin: "http://localhost:3000" },
    data: {
      name: "Tariff test",
      email: `tariffs-${crypto.randomUUID()}@example.test`,
      password: "local-tariff-test-password",
    },
  });
  expect(signup.ok(), await signup.text()).toBeTruthy();
  const saved = await page.request.put("/api/workspace", {
    headers: { origin: "http://localhost:3000" },
    data: { data, version: 0 },
  });
  expect(saved.ok(), await saved.text()).toBeTruthy();
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
  await expect(page.getByRole("dialog")).toContainText("sin tarifa actual");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cancelar", exact: true })
    .click();
  await expect(page.getByRole("article")).toHaveCount(2);
  await page
    .getByRole("button", { name: "Eliminar registro de Casa 24h", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Eliminar registro", exact: true })
    .click();
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
