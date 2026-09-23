import { openComparison } from "./comparison.fixture";
import { expect, test } from "./strict-test";

test("streams guest header actions into the prerendered shell and opens the method from the footer", async ({
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
  const signup = await page.request.post("/api/auth/sign-up/email", {
    headers: { origin: "http://localhost:3000" },
    data: {
      name: "Shell test",
      email: `shell-${crypto.randomUUID()}@example.test`,
      password: "local-shell-test-password",
    },
  });
  expect(signup.ok(), await signup.text()).toBeTruthy();
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
