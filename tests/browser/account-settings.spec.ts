import axe from "axe-core";
import type { Page } from "@playwright/test";
import { expect, test } from "./strict-test";
import { signUpVerified } from "./sign-up";

async function accessibilityViolations(page: Page) {
  await page.addScriptTag({ content: axe.source });
  return page.evaluate(async () => {
    const engine = (window as typeof window & { axe: typeof axe }).axe;
    return (
      await engine.run(document, {
        runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
      })
    ).violations.map((v) => v.id);
  });
}

test("the account page changes the password, exports data and asks for email confirmation before deleting", async ({
  page,
}) => {
  test.skip(
    !process.env.COMPARISON_TEST_DATABASE_URL,
    "Requires disposable local account database.",
  );
  const email = `settings-${crypto.randomUUID()}@example.test`;
  await signUpVerified(page, "Ajustes Test", email, "settings-test-password");
  await page.goto("/");
  await page.getByRole("link", { name: "Hola, Ajustes" }).click();
  await expect(page).toHaveURL(/\/mi-cuenta$/);
  await expect(page.getByText(email)).toBeVisible();
  expect(await accessibilityViolations(page)).toEqual([]);

  await page.getByLabel("Contraseña actual").fill("wrong-password-123");
  await page.getByLabel("Nueva contraseña").fill("a-new-settings-password");
  await page.getByRole("button", { name: "Cambiar contraseña" }).click();
  await expect(
    page.getByText("La contraseña actual no es correcta."),
  ).toBeVisible();
  await page.getByLabel("Contraseña actual").fill("settings-test-password");
  await page.getByRole("button", { name: "Cambiar contraseña" }).click();
  await expect(page.getByText("Contraseña cambiada.")).toBeVisible();

  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Descargar mis datos" }).click();
  expect((await download).suggestedFilename()).toMatch(
    /^luz-en-claro-\d{4}-\d{2}-\d{2}\.json$/,
  );

  await page.getByRole("button", { name: "Eliminar mi cuenta" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("No se puede deshacer");
  await dialog
    .getByRole("button", { name: "Enviar correo de confirmación" })
    .click();
  await expect(page.getByRole("status")).toContainText(
    `Te hemos enviado un correo a ${email}`,
  );
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Hola, Ajustes" })).toBeVisible();
});

test("signed-out visitors are sent to sign in, and the privacy notice is linked from every footer", async ({
  page,
}) => {
  await page.goto("/mi-cuenta");
  await expect(page).toHaveURL(/\/cuenta$/);
  await page.getByRole("link", { name: "Cómo los tratamos" }).click();
  await expect(
    page.getByRole("heading", { name: "Qué guardamos y por qué" }),
  ).toBeVisible();
  expect(await accessibilityViolations(page)).toEqual([]);
  await page.goto("/");
  await page
    .locator("footer")
    .getByRole("link", { name: "Privacidad" })
    .click();
  await expect(page).toHaveURL(/\/privacidad$/);
});
