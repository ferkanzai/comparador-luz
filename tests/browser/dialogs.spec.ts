import { openComparison } from "./comparison.fixture";
import { seedWorkspace, signUpVerified } from "./sign-up";
import { comparisonFixture } from "./comparison.fixture";
import { expect, test } from "./strict-test";

test("a form opened from a tariff's details returns to them when it closes", async ({
  page,
}) => {
  await openComparison(page);
  await page
    .getByRole("button", { name: "Ver desglose de Clara Fija", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toHaveCount(1);
  await expect(dialog).toContainText("Desglose del período");
  await dialog
    .getByRole("button", { name: "Editar tarifa", exact: true })
    .click();
  // One dialog at a time: the form takes the place of the details.
  await expect(page.getByRole("dialog")).toHaveCount(1);
  await expect(
    page.getByRole("heading", { name: "Editar tarifa", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(1);
  await expect(page.getByRole("dialog")).toContainText("Desglose del período");
  // Escape from the form returns too, and Escape from the details closes.
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Editar tarifa", exact: true })
    .click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toContainText("Desglose del período");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  // Focus goes back to what opened the details.
  await expect(
    page.getByRole("button", {
      name: "Ver desglose de Clara Fija",
      exact: true,
    }),
  ).toBeFocused();
});

test("creating a tariff from a bill is a step inside the bill dialog", async ({
  page,
}) => {
  test.skip(
    !process.env.COMPARISON_TEST_DATABASE_URL,
    "Requires a disposable local account database.",
  );
  await page.clock.setFixedTime(new Date("2026-09-22T12:00:00Z"));
  const email = `dialogs-${crypto.randomUUID()}@example.test`;
  await signUpVerified(page, "Dialogs", email, "dialogs-test-only-password");
  await seedWorkspace(email, comparisonFixture());
  await page.goto("/");
  await page
    .getByRole("button", {
      name: "Guardar este período como factura",
      exact: true,
    })
    .click();
  const total = page.getByLabel("Total pagado", { exact: true });
  await total.fill("123,45");
  const create = page.getByRole("button", {
    name: "Crear tarifa con estos precios",
    exact: true,
  });
  await create.click();
  await expect(page.getByRole("dialog")).toHaveCount(1);
  await expect(
    page.getByRole("heading", { name: "Añadir una tarifa", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Volver a la factura", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(1);
  // The bill keeps what was typed, and focus returns to where it left.
  await expect(total).toHaveValue("123,45");
  await expect(create).toBeFocused();
  // Saving the new tariff links it to the bill and returns to the bill too.
  await create.click();
  await page
    .getByLabel("Nombre de la tarifa", { exact: true })
    .fill("Tarifa de la factura");
  await page.getByLabel("P1 · Punta", { exact: true }).first().fill("0,2");
  await page.getByLabel("P2 · Llano", { exact: true }).fill("0,2");
  await page.getByLabel("P3 · Valle", { exact: true }).fill("0,2");
  await page.getByLabel("P1 · Punta", { exact: true }).nth(1).fill("0,1");
  await page.getByLabel("P2 · Valle", { exact: true }).fill("0,05");
  await page
    .getByRole("dialog")
    .getByRole("button", {
      name: "Aplicar tarifa",
    })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(1);
  await expect(total).toHaveValue("123,45");
  await expect(page.getByRole("dialog")).toContainText("Tarifa de la factura");
});

test("dialogs open as a bottom drawer on a phone, dragged only by the handle", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openComparison(page);
  await page
    .getByRole("button", { name: "Editar perfil", exact: true })
    .click();
  const drawer = page.getByRole("dialog");
  await expect(drawer).toHaveAttribute("data-vaul-drawer-direction", "bottom");
  await expect(drawer.locator("[data-vaul-handle]")).toBeVisible();
  // The form scrolls inside the drawer without closing it.
  await drawer
    .getByLabel("Días del período", { exact: true })
    .scrollIntoViewIfNeeded();
  await page.mouse.wheel(0, 400);
  await expect(drawer).toBeVisible();
  await drawer.getByRole("button", { name: "Cerrar", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("confirmations are alert dialogs on desktop and drawers on a phone", async ({
  page,
}) => {
  await openComparison(page);
  const table = page.getByRole("table", {
    name: "Comparativa de tarifas",
    exact: true,
  });
  await table
    .getByRole("button", { name: "Eliminar Clara Fija", exact: true })
    .click();
  const confirm = page.getByRole("alertdialog");
  await expect(confirm).toContainText("Clara Fija");
  await expect(
    confirm.getByRole("button", { name: "Cancelar", exact: true }),
  ).toBeFocused();
  await confirm.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(page.getByRole("alertdialog")).toHaveCount(0);

  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("button", { name: "Eliminar Clara Fija", exact: true })
    .first()
    .click();
  const drawer = page.getByRole("dialog");
  await expect(drawer).toHaveAttribute("data-vaul-drawer-direction", "bottom");
  await drawer.getByRole("button", { name: "Eliminar tarifa" }).click();
  await expect(page.getByText("Clara Fija")).toHaveCount(0);
});
