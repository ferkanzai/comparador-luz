import { expect, type Page } from "@playwright/test";
import { Client } from "pg";
import type { Workspace } from "../../src/lib/domain";

// Stands in for clicking the verification link, which the console mailer only prints on the server.
export async function signUpVerified(
  page: Page,
  name: string,
  email: string,
  password: string,
) {
  // Each test account signs up from its own address, below the per-IP sign-up limit.
  const headers = {
    origin: "http://localhost:3000",
    "x-forwarded-for": `10.${random()}.${random()}.${random()}`,
  };
  const signup = await page.request.post("/api/auth/sign-up/email", {
    headers,
    data: { name, email, password },
  });
  expect(signup.ok(), await signup.text()).toBeTruthy();
  const db = new Client({
    connectionString: process.env.COMPARISON_TEST_DATABASE_URL,
  });
  await db.connect();
  try {
    await db.query(
      'UPDATE "user" SET "emailVerified" = true WHERE email = $1',
      [email],
    );
  } finally {
    await db.end();
  }
  const signin = await page.request.post("/api/auth/sign-in/email", {
    headers,
    data: { email, password },
  });
  expect(signin.ok(), await signin.text()).toBeTruthy();
}
const random = () => Math.floor(Math.random() * 250) + 1;

/**
 * Fills an account's workspace directly in the test database, with the same
 * writer the save endpoints use. The app has no endpoint that replaces a
 * whole workspace.
 */
export async function seedWorkspace(email: string, data: Workspace) {
  process.env.DATABASE_URL ??= process.env.COMPARISON_TEST_DATABASE_URL;
  const { withAccount } = await import("../../src/db");
  const { ensureWorkspace, readWorkspace, writeChanges } =
    await import("../../src/db/workspace");
  const db = new Client({
    connectionString: process.env.COMPARISON_TEST_DATABASE_URL,
  });
  await db.connect();
  let userId: string;
  try {
    const { rows } = await db.query('SELECT id FROM "user" WHERE email = $1', [
      email,
    ]);
    userId = rows[0].id;
  } finally {
    await db.end();
  }
  await withAccount(userId, "write", async (tx) => {
    await ensureWorkspace(tx, userId);
    await writeChanges(tx, userId, await readWorkspace(tx, userId), data);
  });
}
