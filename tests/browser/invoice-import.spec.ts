import { readFileSync } from "node:fs";
import { expect, test } from "./strict-test";
import { signUpVerified } from "./sign-up";
import { openComparison } from "./comparison.fixture";

test("a guest imports an invoice PDF into an empty comparison, without sending it anywhere or recording a bill they can't see", async ({
  page,
}) => {
  const sent: string[] = [];
  page.on("request", (request) => {
    if (request.method() !== "GET") sent.push(request.url());
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Sube tu factura", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "Importar factura" });
  await expect(dialog).toContainText("no la guardamos ni la enviamos");
  await dialog
    .locator('input[type="file"]')
    .setInputFiles("tests/fixtures/invoice.pdf");
  await expect(dialog.getByLabel("Comercializadora")).toHaveValue(
    "Octopus Energy España",
  );
  await expect(dialog).toContainText("26,35");
  await dialog.getByLabel("Desde cuándo tienes esta tarifa").fill("2026-02-27");
  await dialog.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(dialog).toHaveCount(0);

  const table = page.getByRole("table", {
    name: "Comparativa de tarifas",
    exact: true,
  });
  const current = table
    .getByRole("row")
    .filter({ hasText: "Octopus Energy España" });
  await expect(current).toContainText("Tu tarifa actual");
  // The QR rounds kWh to whole units, so the estimate is close to, not equal to, the 26,35 paid.
  await expect(current).toContainText("26,38");
  expect(sent).toEqual([]);
});

test("an image of the QR opens the review, and a picture without one explains what to try", async ({
  page,
}) => {
  // Browsers without BarcodeDetector decode with zxing's WebAssembly.
  await page.addInitScript(() => {
    delete (globalThis as { BarcodeDetector?: unknown }).BarcodeDetector;
  });
  const wasm: string[] = [];
  page.on("request", (request) => {
    if (request.url().endsWith(".wasm")) wasm.push(new URL(request.url()).host);
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Sube tu factura", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "Importar factura" });
  const input = dialog.locator('input[type="file"]');
  await input.setInputFiles({
    name: "captura.png",
    mimeType: "image/png",
    buffer: await page.screenshot(),
  });
  await expect(dialog.getByRole("alert")).toContainText(
    "No encontramos el código QR",
  );
  await input.setInputFiles("tests/fixtures/invoice-qr.png");
  await expect(dialog.getByLabel("Comercializadora")).toHaveValue(
    "Octopus Energy España",
  );
  await expect(dialog.getByText("Registrar la factura")).toHaveCount(0);
  // Served by this site, never a CDN.
  expect(wasm.length).toBeGreaterThan(0);
  expect(wasm.every((host) => host === "localhost:3000")).toBe(true);
});

test("an account records the imported bill from the bills tab", async ({
  page,
}) => {
  test.skip(
    !process.env.COMPARISON_TEST_DATABASE_URL,
    "Requires disposable local account database.",
  );
  await signUpVerified(
    page,
    "Factura Test",
    `invoice-${crypto.randomUUID()}@example.test`,
    "invoice-test-password",
  );
  await page.goto("/?tab=facturas");
  await page
    .getByRole("button", { name: "Importar factura", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "Importar factura" });
  await dialog
    .locator('input[type="file"]')
    .setInputFiles("tests/fixtures/invoice.pdf");
  await expect(dialog.getByLabel("Mes de la factura")).toHaveValue("2026-09");
  await dialog.getByLabel("Desde cuándo tienes esta tarifa").fill("2026-02-27");
  await dialog.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByText("26,35 €").first()).toBeVisible();
  await page.reload();
  await expect(page.getByText("26,35 €").first()).toBeVisible();
});

test("with tariffs already entered, the comparison still offers the upload", async ({
  page,
}) => {
  await openComparison(page);
  await page
    .getByRole("button", { name: "Sube tu factura", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Importar factura" }),
  ).toBeVisible();
});

test("dropping the invoice PDF onto the dialog reads it", async ({ page }) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Sube tu factura", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "Importar factura" });
  const zone = dialog.getByText("Elegir PDF o imagen");
  await expect(dialog.getByText("o arrástralo aquí")).toBeVisible();
  const pdf = readFileSync("tests/fixtures/invoice.pdf").toString("base64");
  const drop = await page.evaluateHandle((data) => {
    const transfer = new DataTransfer();
    const bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
    transfer.items.add(
      new File([bytes], "factura.pdf", { type: "application/pdf" }),
    );
    return transfer;
  }, pdf);
  await zone.dispatchEvent("dragover", { dataTransfer: drop });
  await expect(dialog.getByText("Suelta aquí tu factura")).toBeVisible();
  await dialog
    .getByText("Suelta aquí tu factura")
    .dispatchEvent("drop", { dataTransfer: drop });
  await expect(dialog.getByLabel("Comercializadora")).toHaveValue(
    "Octopus Energy España",
  );
});
