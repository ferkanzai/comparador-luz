import { openComparison } from "./comparison.fixture";
import { expect, test } from "./strict-test";
import { signUpVerified } from "./sign-up";

test("renders guest header actions with the page and opens the method from the footer", async ({
  page,
}) => {
  await page.goto("/");
  const header = page.getByRole("banner");
  await expect(
    header.getByRole("link", { name: "Iniciar sesión", exact: true }),
  ).toBeVisible();
  await expect(
    header.getByRole("link", { name: "Crear cuenta", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /Que tu próxima factura/ }),
  ).toBeVisible();
  const trigger = page
    .locator("footer")
    .getByRole("button", { name: "Método y fuentes", exact: true });
  await trigger.click();
  const method = page.getByRole("dialog", {
    name: "Sin letra pequeña en el cálculo",
  });
  await expect(method).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(method).toHaveCount(0);
});

test("sends the header actions and hero in the first HTML, so nothing shifts in later", async ({
  request,
}) => {
  const html = await (await request.get("/")).text();
  expect(html).toContain("Iniciar sesión");
  expect(html).toContain("Que tu próxima factura");
});

test("opens the method from the comparator's tax settings", async ({
  page,
}) => {
  await openComparison(page);
  await page
    .getByRole("button", { name: "Editar perfil", exact: true })
    .click();
  await page
    .getByRole("dialog", { name: "Tu perfil de consumo" })
    .getByRole("button", { name: "Cómo calculamos los impuestos", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Sin letra pequeña en el cálculo" }),
  ).toBeVisible();
});

test("sends failed verification links to the account page with an explanation", async ({
  page,
}) => {
  await page.goto("/?error=INVALID_TOKEN");
  await expect(page).toHaveURL(/\/cuenta\?error=invalid-verification$/);
  await expect(
    page.getByText("El enlace ha caducado o no es válido. Solicita uno nuevo."),
  ).toBeVisible();
});

test("greets a signed-in user in the header and signs out", async ({
  page,
}) => {
  test.skip(
    !process.env.COMPARISON_TEST_DATABASE_URL,
    "Requires disposable local account database.",
  );
  await signUpVerified(
    page,
    "Shell test",
    `shell-${crypto.randomUUID()}@example.test`,
    "local-shell-test-password",
  );
  await page.goto("/");
  const header = page.getByRole("banner");
  await expect(header.getByText("Hola, Shell", { exact: true })).toBeVisible();
  await header
    .getByRole("button", { name: "Cerrar sesión", exact: true })
    .click();
  await expect(
    header.getByRole("link", { name: "Iniciar sesión", exact: true }),
  ).toBeVisible();
});

test("a first visit offers one way to start and nothing that needs data", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Añadir mi tarifa actual", exact: true }),
  ).toBeVisible();
  for (const name of [
    "Añadir tarifa",
    "Simular consumo",
    "Exportar",
    "Comparar con PVPC",
  ])
    await expect(page.getByRole("button", { name, exact: true })).toHaveCount(
      0,
    );
  await expect(page.getByText("Guardado en este dispositivo")).toHaveCount(0);
  // Once there is a tariff, the rest appears.
  await openComparison(page);
  await expect(
    page.getByRole("button", { name: "Simular consumo", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Guardado en este dispositivo")).toBeVisible();
});
