import { test } from "node:test";
import assert from "node:assert/strict";
import { Pool } from "pg";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { newTariff } from "../src/lib/domain";

// Drizzle wraps driver errors; the database's message is in `cause`.
const cause = (pattern: RegExp) => (error: unknown) =>
  pattern.test(String((error as { cause?: Error }).cause?.message));

// Explicit opt-in: this replaces the public schema of a disposable local database.
test(
  "Postgres: baseline migration, account isolation and cascade on account deletion",
  { skip: !process.env.TEST_WORKSPACE_DATABASE_URL },
  async () => {
    const url = new URL(process.env.TEST_WORKSPACE_DATABASE_URL!);
    assert.ok(
      ["localhost", "127.0.0.1"].includes(url.hostname) &&
        url.pathname.endsWith("_workspace_test"),
      "Use a disposable local *_workspace_test database",
    );
    process.env.DATABASE_URL = url.toString();
    const { withAccount } = await import("../src/db");
    const { getPool } = await import("../src/lib/db");
    const { tariff, workspace } = await import("../src/db/schema");
    const pool = new Pool({ connectionString: url.toString() });
    const run = () =>
      migrate(drizzle({ client: pool }), { migrationsFolder: "migrations" });
    try {
      // A database from before Drizzle, with Better Auth's user table.
      await pool.query(`
        DROP SCHEMA IF EXISTS drizzle CASCADE; DROP SCHEMA public CASCADE; CREATE SCHEMA public;
        CREATE TABLE "user" (id TEXT PRIMARY KEY); INSERT INTO "user" VALUES ('alice'), ('bob');
        CREATE TABLE workspace (user_id TEXT PRIMARY KEY, data JSONB);
        CREATE TABLE app_migration (id TEXT PRIMARY KEY);`);
      await run();
      await run(); // Reruns apply nothing.
      assert.equal(
        (await pool.query("SELECT to_regclass('app_migration') AS t")).rows[0]
          .t,
        null,
      );

      const offer = { ...newTariff(), name: "Oferta" };
      // The domain's empty strings become NULL; that mapping comes with the endpoints.
      const row = Object.fromEntries(
        Object.entries(offer).map(([k, v]) => [
          k,
          v === "" && k !== "provider" && k !== "url" && k !== "notes"
            ? null
            : v,
        ]),
      ) as typeof offer;
      Object.assign(row, {
        energyPeak: "0.1234567890123456789",
        checkedOn: "2026-09-01",
      });
      await withAccount("alice", "write", async (tx) => {
        await tx.insert(workspace).values({
          userId: "alice",
          taxes: true,
          minimumTax: true,
        });
        await tx.insert(tariff).values({ ...row, userId: "alice" });
        await tx
          .update(workspace)
          .set({ currentTariffId: offer.id, currentSince: "2026-01-01" })
          .where(eq(workspace.userId, "alice"));
      });
      const stored = await withAccount("alice", "read", (tx) =>
        tx.select().from(tariff),
      );
      assert.equal(stored.length, 1);
      assert.equal(stored[0].energyPeak, "0.1234567890123456789");
      assert.equal(stored[0].checkedOn, "2026-09-01");
      assert.equal(typeof stored[0].seq, "number");

      // Row-level security hides and protects other accounts' rows.
      assert.deepEqual(
        await withAccount("bob", "read", (tx) => tx.select().from(tariff)),
        [],
      );
      await assert.rejects(
        withAccount("bob", "write", (tx) =>
          tx.insert(workspace).values({
            userId: "alice",
            taxes: true,
            minimumTax: true,
          }),
        ),
        cause(/row-level security/),
      );
      await assert.rejects(
        withAccount("bob", "read", (tx) =>
          tx.insert(workspace).values({
            userId: "bob",
            taxes: true,
            minimumTax: true,
          }),
        ),
        cause(/read-only/),
      );
      // The role and identity never outlive their transaction.
      const { rows } = await pool.query(
        "SELECT current_user AS role, current_setting('app.user_id', true) AS id",
      );
      assert.notEqual(rows[0].role, "luz_workspace");
      assert.ok(!rows[0].id);

      await pool.query(`DELETE FROM "user" WHERE id = 'alice'`);
      assert.equal(
        (await pool.query("SELECT count(*)::int AS n FROM tariff")).rows[0].n,
        0,
      );
    } finally {
      await pool.end();
      await getPool().end();
    }
  },
);
