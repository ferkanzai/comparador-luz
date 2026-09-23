import { after, test } from "node:test";
import assert from "node:assert/strict";
import { Pool } from "pg";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import {
  emptyWorkspace,
  newTariff,
  workspaceSchema,
  type Workspace,
} from "../src/lib/domain";

// The app's shared pool serves both tests; close it once they are done.
after(async () => {
  if (!process.env.TEST_WORKSPACE_DATABASE_URL) return;
  const { getPool } = await import("../src/lib/db");
  await getPool().end();
});

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
    }
  },
);

function fullWorkspace(): Workspace {
  const current = {
    ...newTariff(),
    name: "Actual",
    provider: "Comercializadora",
    energyPeak: "0,1234567890123456789012",
    powerPeak: "0.1",
    snoeeKwh: "0.0034",
    checkedOn: "2026-09-01",
  };
  const w = emptyWorkspace();
  w.profile = {
    ...w.profile,
    days: "30",
    peakKwh: "10",
    taxes: true,
    vat: "21",
  };
  w.tariffs = [current, { ...newTariff(), name: "Alternativa" }];
  w.currentId = current.id;
  w.currentSince = "2026-02-01";
  w.history = [
    {
      id: crypto.randomUUID(),
      start: "2026-01-01",
      end: "2026-02-01",
      tariff: { ...current, name: "Anterior", energyPeak: "0.2" },
    },
  ];
  const bill = {
    id: crypto.randomUUID(),
    month: "2026-02",
    periodStart: "2026-02-01",
    periodEnd: "2026-03-01",
    provider: "Comercializadora",
    paid: "-1,50",
    credit: "11.5",
    kwh: "60",
    notes: "Con crédito",
    // Bill parts are read separately; decimals must stay exact there too.
    tariff: {
      ...current,
      name: "En la factura",
      energyPeak: "0.30",
      energyFlat: "0.1234567890123456789012",
    },
    profile: structuredClone(w.profile),
    consumption: { peakKwh: "10", flatKwh: "20", valleyKwh: "30" },
    tariffReview: { signature: "review-1", reason: "Revisada" },
    breakdown: {
      energy: "9.25",
      power: "0",
      social: "0",
      snoee: "0.75",
      meter: "0",
      services: "0",
      electricityTax: "0",
      vat: "0",
      servicesVat: "0",
    },
  };
  w.bills = [
    bill,
    {
      ...bill,
      id: crypto.randomUUID(),
      consumption: null,
      profile: null,
      tariff: null,
    },
    {
      ...bill,
      id: crypto.randomUUID(),
      consumption: undefined,
      breakdown: null,
      tariffReview: undefined,
    },
  ];
  return workspaceSchema.parse(w);
}
// What the database gives back: decimals with a point and no leading zeros.
const stored = (w: Workspace): Workspace =>
  JSON.parse(JSON.stringify(w).replace(/"(-?\d+),(\d+)"/g, '"$1.$2"'));

test(
  "Postgres: a workspace survives a round trip, and only what changed is written",
  { skip: !process.env.TEST_WORKSPACE_DATABASE_URL },
  async () => {
    const url = process.env.TEST_WORKSPACE_DATABASE_URL!;
    process.env.DATABASE_URL = url;
    const { withAccount } = await import("../src/db");
    const { ensureWorkspace, readWorkspace, writeChanges } =
      await import("../src/db/workspace");
    const { consumeSaveAllowance, saveLimit } =
      await import("../src/lib/account-api");
    const pool = new Pool({ connectionString: url });
    const save = (next: Workspace) =>
      withAccount("carol", "write", async (tx) => {
        await ensureWorkspace(tx, "carol");
        await writeChanges(tx, "carol", await readWorkspace(tx, "carol"), next);
      });
    const read = () =>
      withAccount("carol", "read", (tx) => readWorkspace(tx, "carol"));
    try {
      await pool.query(`
        DROP SCHEMA IF EXISTS drizzle CASCADE; DROP SCHEMA public CASCADE; CREATE SCHEMA public;
        CREATE TABLE "user" (id TEXT PRIMARY KEY); INSERT INTO "user" VALUES ('carol');`);
      await migrate(drizzle({ client: pool }), {
        migrationsFolder: "migrations",
      });

      assert.deepEqual(await read(), emptyWorkspace());
      const full = fullWorkspace();
      await save(full);
      assert.deepEqual(await read(), stored(full));

      // Edit one bill's parts, retire the current tariff and add an offer.
      const [first, second, third] = full.bills;
      const offer = { ...newTariff(), name: "Nueva" };
      const edited: Workspace = {
        ...full,
        profile: { ...full.profile, days: "31" },
        tariffs: [full.tariffs[1], offer],
        currentId: null,
        currentSince: "",
        history: [],
        bills: [
          { ...first, tariff: null, breakdown: null, notes: "Editada" },
          third,
        ],
      };
      await save(edited);
      assert.deepEqual(await read(), stored(edited));
      const { rows } = await pool.query(
        "SELECT (SELECT count(*) FROM bill_tariff)::int AS tariffs, (SELECT count(*) FROM bill_breakdown)::int AS breakdowns, (SELECT count(*) FROM bill WHERE id = $1)::int AS removed",
        [second.id],
      );
      assert.deepEqual(rows[0], { tariffs: 1, breakdowns: 0, removed: 0 });
      // Records keep the order they were created in.
      assert.deepEqual(
        (await read()).tariffs.map((t) => t.name),
        ["Alternativa", "Nueva"],
      );

      // Saves are limited per account and minute.
      for (let i = 0; i < saveLimit.max; i++)
        assert.equal(await consumeSaveAllowance("carol"), true);
      assert.equal(await consumeSaveAllowance("carol"), false);
    } finally {
      await pool.end();
    }
  },
);
