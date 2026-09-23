import { test } from "node:test";
import assert from "node:assert/strict";
import { Pool } from "pg";
import {
  emptyWorkspace,
  newTariff,
  workspaceSchema,
  type Workspace,
} from "../src/lib/domain";
import {
  loadMigrations,
  migrateWorkspaces,
} from "../src/lib/workspace-migrations";
import {
  columnOf,
  tableFields,
  type FieldGroup,
} from "../src/lib/workspace-fields";
import { workspaceTables } from "../src/lib/workspace-records";

function fixture(): Workspace {
  const tariff = {
    ...newTariff(),
    name: "Current",
    provider: "Supplier",
    energyPeak: "0,1234567890123456789012",
    snoeeKwh: "0,0034567890123456789012",
    checkedOn: "2026-09-01",
  };
  const w = emptyWorkspace();
  w.profile = {
    ...w.profile,
    days: "30",
    peakKwh: "10",
    flatKwh: "20",
    valleyKwh: "30",
    taxes: true,
    vat: "21",
  };
  w.tariffs = [tariff, { ...newTariff(), name: "Alternative" }];
  w.currentId = tariff.id;
  w.currentSince = "2026-02-01";
  w.reviewedOn = "2026-09-01";
  w.history = [
    {
      id: crypto.randomUUID(),
      start: "2026-01-01",
      end: "2026-02-01",
      tariff: {
        ...tariff,
        name: "Historical",
        energyPeak: "0.2",
        snoeeKwh: "0.002",
      },
    },
  ];
  const bill = {
    id: crypto.randomUUID(),
    month: "2026-02",
    periodStart: "2026-02-01",
    periodEnd: "2026-03-01",
    provider: "Supplier",
    paid: "-1,50",
    credit: "11.5",
    kwh: "60",
    notes: "Credit preserved",
    tariff: {
      ...tariff,
      name: "Bill snapshot",
      energyPeak: "0.3",
      snoeeKwh: "0.003",
    },
    profile: structuredClone(w.profile),
    consumption: { peakKwh: "10", flatKwh: "20", valleyKwh: "30" },
    tariffReview: { signature: "review-1", reason: "Confirmed from invoice" },
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
  const parsed = workspaceSchema.parse(w);
  return parsed;
}
const normalized = (w: Workspace): Workspace => {
  const result = JSON.parse(
    JSON.stringify(w).replace(/"(-?\d+),(\d+)"/g, '"$1.$2"'),
  ) as Workspace;
  return result;
};

test(
  "relational migration, constraints, transactions and database-level tenant isolation",
  { skip: !process.env.TEST_WORKSPACE_DATABASE_URL },
  async () => {
    const url = new URL(process.env.TEST_WORKSPACE_DATABASE_URL!);
    assert.ok(
      ["localhost", "127.0.0.1"].includes(url.hostname) &&
        url.pathname.endsWith("_workspace_test"),
      "Use a disposable local *_workspace_test database; this test replaces its public schema",
    );
    process.env.DATABASE_URL = url.toString();
    const pool = new Pool({ connectionString: url.toString() });
    const { getPool } = await import("../src/lib/db");
    const {
      consumeSaveAllowance,
      readWorkspace,
      saveWorkspace,
      withWorkspaceTransaction,
      workspaceSaveLimit,
    } = await import("../src/lib/workspace-store");
    const original = fixture();
    try {
      await pool.query(
        'DROP SCHEMA public CASCADE; CREATE SCHEMA public; CREATE TABLE "user" (id TEXT PRIMARY KEY); INSERT INTO "user" VALUES (\'alice\'), (\'bob\'); CREATE TABLE workspace (user_id TEXT PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE, data JSONB NOT NULL, version INTEGER NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT now())',
      );
      await pool.query(
        "INSERT INTO workspace (user_id, data, version) VALUES ('alice', $1, 7), ('bob', '{}', 3)",
        [
          JSON.stringify({
            ...original,
            bills: [
              ...original.bills,
              {
                id: "discard-even-if-invalid",
                priceLines: [{ amount: "bad" }],
              },
            ],
          }),
        ],
      );
      await assert.rejects(migrateWorkspaces(pool), /failed validation/);
      assert.equal(
        (await pool.query("SELECT data FROM workspace WHERE user_id = 'alice'"))
          .rows[0].data.bills.length,
        4,
        "failed migration leaves legacy data usable",
      );
      assert.equal(
        (await pool.query("SELECT to_regclass('workspace_bill') AS name"))
          .rows[0].name,
        null,
      );
      await pool.query("UPDATE workspace SET data = $1 WHERE user_id = 'bob'", [
        JSON.stringify(emptyWorkspace()),
      ]);
      await migrateWorkspaces(pool);
      await migrateWorkspaces(pool); // Idempotent.
      assert.equal(
        (
          await pool.query(
            "SELECT to_regclass('workspace_bill_price_line') AS name",
          )
        ).rows[0].name,
        null,
      );
      assert.deepEqual(await readWorkspace("alice"), {
        data: normalized(original),
        version: 7,
      });
      assert.deepEqual(await readWorkspace("bob"), {
        data: emptyWorkspace(),
        version: 3,
      });
      // Simulate a deployment that already ran 001 with the old price-line relation.
      await pool.query(
        "DELETE FROM app_migration WHERE id = '002-remove-invoice-price-lines'",
      );
      await pool.query(`CREATE TABLE workspace_bill_price_line (
        user_id TEXT NOT NULL, bill_id UUID NOT NULL,
        FOREIGN KEY (user_id, bill_id) REFERENCES workspace_bill(user_id, id) ON DELETE CASCADE
      )`);
      const retired = structuredClone(original);
      // Keep one plain invoice while two contain tramos.
      assert.equal(await saveWorkspace("bob", retired, 3), 4);
      await pool.query(
        "INSERT INTO workspace_bill_price_line VALUES ('bob', $1), ('bob', $2)",
        [retired.bills[0].id, retired.bills[1].id],
      );
      await pool.query(
        "ALTER TABLE workspace_bill_price_line ENABLE ROW LEVEL SECURITY; ALTER TABLE workspace_bill_price_line FORCE ROW LEVEL SECURITY",
      );
      await migrateWorkspaces(pool);
      await migrateWorkspaces(pool);
      const cleaned = await readWorkspace("bob");
      assert.equal(cleaned.version, 5);
      assert.deepEqual(
        cleaned.data.bills.map((b) => b.id),
        [retired.bills[2].id],
      );
      assert.equal(
        await saveWorkspace("bob", original, 4),
        null,
        "stale browser cannot restore removed invoices",
      );
      assert.equal(
        (
          await pool.query(
            "SELECT to_regclass('workspace_bill_price_line') AS name",
          )
        ).rows[0].name,
        null,
      );
      await withWorkspaceTransaction("bob", true, async (c) => {
        assert.equal(
          (await c.query("SELECT * FROM workspace_bill_profile")).rowCount,
          1,
        );
        assert.equal(
          (await c.query("SELECT * FROM workspace_bill_breakdown")).rowCount,
          0,
        );
        assert.equal(
          (
            await c.query(
              "SELECT * FROM workspace_tariff_snapshot WHERE snapshot_key LIKE 'bill/%'",
            )
          ).rowCount,
          1,
        );
      });
      // Reset Bob for the independent isolation checks below.
      assert.equal(await saveWorkspace("bob", emptyWorkspace(), 5), 6);
      const columns = await pool.query(
        "SELECT table_name FROM information_schema.columns WHERE table_name = ANY($1) AND data_type IN ('json','jsonb')",
        [workspaceTables],
      );
      assert.equal(columns.rowCount, 0);
      const policies = await pool.query(
        "SELECT relname, relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname = ANY($1)",
        [workspaceTables],
      );
      assert.equal(policies.rowCount, workspaceTables.length);
      assert.ok(
        policies.rows.every((r) => r.relrowsecurity && r.relforcerowsecurity),
      );
      // Deliberately omit ownership filters: the database itself must isolate every relation.
      await withWorkspaceTransaction("bob", false, async (client) => {
        for (const table of workspaceTables) {
          assert.ok(
            (await client.query(`SELECT user_id FROM ${table}`)).rows.every(
              (r) => r.user_id === "bob",
            ),
          );
          assert.equal(
            (await client.query(`DELETE FROM ${table} WHERE user_id = 'alice'`))
              .rowCount,
            0,
          );
          assert.equal(
            (
              await client.query(
                `UPDATE ${table} SET user_id = 'bob' WHERE user_id = 'alice'`,
              )
            ).rowCount,
            0,
          );
        }
        const role = (
          await client.query(
            "SELECT rolname, rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user",
          )
        ).rows[0];
        assert.deepEqual(role, {
          rolname: "luz_workspace",
          rolsuper: false,
          rolbypassrls: false,
        });
      });
      await assert.rejects(
        withWorkspaceTransaction("bob", false, (c) =>
          c.query(
            "INSERT INTO workspace (user_id, version) VALUES ('mallory', 1)",
          ),
        ),
        /row-level security/,
      );
      await assert.rejects(
        withWorkspaceTransaction("alice", false, (c) =>
          c.query(
            "UPDATE workspace SET user_id = 'bob' WHERE user_id = 'alice'",
          ),
        ),
        /row-level security/,
      );
      await assert.rejects(
        withWorkspaceTransaction("alice", true, (c) =>
          c.query('SELECT * FROM "user"'),
        ),
        /permission denied/,
      );
      await assert.rejects(
        withWorkspaceTransaction("alice", true, (c) =>
          c.query("SELECT * FROM workspace_legacy"),
        ),
        /permission denied/,
      );
      await assert.rejects(
        withWorkspaceTransaction("alice", false, (c) =>
          c.query("TRUNCATE workspace_bill"),
        ),
        /permission denied/,
      );
      for (const table of workspaceTables) {
        const row = (
          await pool.query(
            `SELECT * FROM ${table} WHERE user_id = 'alice' LIMIT 1`,
          )
        ).rows[0];
        assert.ok(row);
        await assert.rejects(
          withWorkspaceTransaction("bob", false, (c) =>
            c.query(
              `INSERT INTO ${table} SELECT * FROM json_populate_record(NULL::${table}, $1::json)`,
              [JSON.stringify(row)],
            ),
          ),
          /row-level security/,
        );
      }
      // Missing identity denies access; SET LOCAL is gone after commit and rollback.
      const client = await pool.connect();
      try {
        await client.query("BEGIN; SET LOCAL ROLE luz_workspace");
        assert.equal(
          (await client.query("SELECT * FROM workspace")).rowCount,
          0,
        );
        await assert.rejects(
          client.query(
            "INSERT INTO workspace (user_id, version) VALUES ('mallory', 1)",
          ),
          /row-level security/,
        );
        await client.query("ROLLBACK");
      } finally {
        client.release();
      }
      const checkLeak = await getPool().connect();
      try {
        assert.ok(
          !(
            await checkLeak.query(
              "SELECT current_setting('app.user_id', true) AS id",
            )
          ).rows[0].id,
        );
      } finally {
        checkLeak.release();
      }
      // Cross-account references fail even if the referenced UUID is known.
      await assert.rejects(
        withWorkspaceTransaction("bob", false, (c) =>
          c.query(
            "UPDATE workspace SET current_id = $1 WHERE user_id = 'bob'",
            [original.currentId],
          ),
        ),
        /foreign key/,
      );
      await assert.rejects(
        withWorkspaceTransaction("alice", false, (c) =>
          c.query("UPDATE workspace_tariff SET energy_peak = -1"),
        ),
        /check constraint/,
      );
      // One winner per version, including simultaneous first saves.
      const changed = structuredClone(original);
      changed.tariffs.reverse();
      changed.tariffs.find((t) => t.id === original.currentId)!.energyPeak =
        "0.9";
      changed.tariffs.find((t) => t.id === original.currentId)!.snoeeKwh =
        "0.01";
      const versions = await Promise.all([
        saveWorkspace("alice", changed, 7),
        saveWorkspace("alice", changed, 7),
      ]);
      assert.deepEqual(versions.sort(), [8, null]);
      let stored = await readWorkspace("alice");
      assert.deepEqual(stored.data, normalized(changed));
      assert.equal(stored.data.history[0].tariff.energyPeak, "0.2");
      assert.equal(stored.data.bills[0].tariff!.energyPeak, "0.3");
      assert.equal(stored.data.history[0].tariff.snoeeKwh, "0.002");
      assert.equal(stored.data.bills[0].tariff!.snoeeKwh, "0.003");
      assert.equal(stored.data.bills[0].breakdown!.snoee, "0.75");
      await pool.query("INSERT INTO \"user\" VALUES ('new')");
      assert.deepEqual(
        (
          await Promise.all([
            saveWorkspace("new", emptyWorkspace(), 0),
            saveWorkspace("new", emptyWorkspace(), 0),
          ])
        ).sort(),
        [1, null],
      );
      await withWorkspaceTransaction("bob", true, async (c) => {
        const before = (
          await c.query("SELECT version FROM workspace WHERE user_id = 'bob'")
        ).rows[0].version;
        assert.equal(
          await saveWorkspace("bob", emptyWorkspace(), before),
          before + 1,
        );
        assert.equal(
          (await c.query("SELECT version FROM workspace WHERE user_id = 'bob'"))
            .rows[0].version,
          before,
          "multi-query reads see a consistent snapshot",
        );
      });
      // A late failure rolls back both version and all previous row changes.
      await assert.rejects(
        withWorkspaceTransaction("alice", false, async (c) => {
          await c.query("UPDATE workspace SET version = version + 1");
          await c.query("DELETE FROM workspace_bill");
          throw new Error("simulated failure");
        }),
        /simulated failure/,
      );
      assert.deepEqual(await readWorkspace("alice"), stored);
      assert.deepEqual(await readWorkspace("bob"), {
        data: emptyWorkspace(),
        version: 7,
      });
      const cleared = emptyWorkspace();
      assert.equal(await saveWorkspace("alice", cleared, 8), 9);
      stored = await readWorkspace("alice");
      assert.deepEqual(stored, { data: cleared, version: 9 });
      await withWorkspaceTransaction("alice", true, async (c) => {
        for (const table of workspaceTables.filter(
          (t) => !["workspace", "workspace_profile"].includes(t),
        ))
          assert.equal((await c.query(`SELECT * FROM ${table}`)).rowCount, 0);
      });
      await pool.query("DELETE FROM \"user\" WHERE id = 'alice'");
      assert.equal((await readWorkspace("alice")).version, 0);
      // Fresh install follows the same schema path, without a JSON table or archive.
      await pool.query(
        'DROP SCHEMA public CASCADE; CREATE SCHEMA public; CREATE TABLE "user" (id TEXT PRIMARY KEY)',
      );
      assert.deepEqual(
        await migrateWorkspaces(pool),
        (await loadMigrations()).map((m) => m.id),
        "a fresh install applies every migration file, in order",
      );
      assert.deepEqual(await migrateWorkspaces(pool), []);
      assert.equal(
        (await pool.query("SELECT to_regclass('workspace_legacy') AS name"))
          .rows[0].name,
        null,
      );
      // A database migrated by a newer build must not be touched by an older one.
      await pool.query(
        "INSERT INTO app_migration (id) VALUES ('999-from-the-future')",
      );
      await assert.rejects(
        migrateWorkspaces(pool),
        /doesn't include \(999-from-the-future\)/,
      );
      await pool.query(
        "DELETE FROM app_migration WHERE id = '999-from-the-future'",
      );
      await pool.query("INSERT INTO \"user\" VALUES ('fresh')");
      assert.equal(await saveWorkspace("fresh", original, 0), 1);
      assert.deepEqual(
        (await readWorkspace("fresh")).data,
        normalized(original),
      );
      // Simulate an existing relational deployment before 003, with unchanged old totals.
      const beforeSnoee = structuredClone(original);
      for (const t of beforeSnoee.tariffs) t.snoeeKwh = "";
      for (const h of beforeSnoee.history) h.tariff.snoeeKwh = "";
      for (const b of beforeSnoee.bills) {
        if (b.tariff) b.tariff.snoeeKwh = "";
        if (b.breakdown) {
          b.breakdown.energy = "10";
          b.breakdown.snoee = "0";
        }
      }
      assert.equal(await saveWorkspace("fresh", beforeSnoee, 1), 2);
      await pool.query(`
        ALTER TABLE workspace_tariff DROP COLUMN snoee_kwh;
        ALTER TABLE workspace_tariff_snapshot DROP COLUMN snoee_kwh;
        ALTER TABLE workspace_bill_breakdown DROP COLUMN snoee;
        DELETE FROM app_migration WHERE id = '003-snoee-cost';
      `);
      await migrateWorkspaces(pool);
      await migrateWorkspaces(pool);
      assert.deepEqual(await readWorkspace("fresh"), {
        data: normalized(beforeSnoee),
        version: 2,
      });
      assert.equal(await saveWorkspace("fresh", original, 2), 3);
      assert.deepEqual(
        (await readWorkspace("fresh")).data,
        normalized(original),
      );
      await assert.rejects(
        withWorkspaceTransaction("fresh", false, (c) =>
          c.query("UPDATE workspace_tariff SET snoee_kwh = -1"),
        ),
        /check constraint/,
      );
      // A cleared credit field means no credit; the column is NOT NULL.
      const noCredit = structuredClone(original);
      noCredit.bills[1].credit = "";
      noCredit.bills[1].paid = "10";
      assert.equal(
        await saveWorkspace("fresh", workspaceSchema.parse(noCredit), 3),
        4,
      );
      assert.equal((await readWorkspace("fresh")).data.bills[1].credit, "0");
      // Saves are limited per account and minute; other accounts keep saving.
      await pool.query("INSERT INTO \"user\" VALUES ('other')");
      for (let i = 0; i < workspaceSaveLimit.max; i++)
        assert.equal(await consumeSaveAllowance("fresh"), true);
      assert.equal(await consumeSaveAllowance("fresh"), false);
      assert.equal(await consumeSaveAllowance("other"), true);
      await withWorkspaceTransaction("other", true, async (c) =>
        assert.equal(
          (await c.query("SELECT * FROM workspace_save_rate")).rowCount,
          1,
          "an account only sees its own counter",
        ),
      );
      await pool.query(
        "UPDATE workspace_save_rate SET window_start = now() - interval '61 seconds' WHERE user_id = 'fresh'",
      );
      assert.equal(await consumeSaveAllowance("fresh"), true);
    } finally {
      await pool.end();
      await getPool().end();
    }
  },
);

// Keys, ordering and markers the registry deliberately doesn't describe.
const structuralColumns: Record<string, string[]> = {
  workspace: ["user_id", "version", "current_id", "updated_at"],
  workspace_profile: ["user_id"],
  workspace_tariff: ["user_id", "id", "position"],
  workspace_tariff_snapshot: ["user_id", "snapshot_key", "tariff_id"],
  workspace_history: ["user_id", "id", "position", "snapshot_key"],
  workspace_bill: [
    "user_id",
    "id",
    "position",
    "snapshot_key",
    "consumption_kind",
    "review_signature",
    "review_reason",
  ],
  workspace_bill_profile: ["user_id", "bill_id"],
  workspace_bill_breakdown: ["user_id", "bill_id"],
};

test(
  "the storage registry matches the migrated columns and CHECK constraints",
  { skip: !process.env.TEST_WORKSPACE_DATABASE_URL },
  async () => {
    const url = new URL(process.env.TEST_WORKSPACE_DATABASE_URL!);
    assert.ok(
      ["localhost", "127.0.0.1"].includes(url.hostname) &&
        url.pathname.endsWith("_workspace_test"),
    );
    const pool = new Pool({ connectionString: url.toString() });
    try {
      await pool.query(
        'DROP SCHEMA public CASCADE; CREATE SCHEMA public; CREATE TABLE "user" (id TEXT PRIMARY KEY)',
      );
      await migrateWorkspaces(pool);
      assert.deepEqual(
        Object.keys(tableFields).sort(),
        [...workspaceTables].sort(),
      );
      for (const [table, groups] of Object.entries(
        tableFields as Record<string, readonly FieldGroup[]>,
      )) {
        const { rows: columns } = await pool.query<{
          column_name: string;
          data_type: string;
          is_nullable: "YES" | "NO";
          character_maximum_length: number | null;
        }>(
          "SELECT column_name, data_type, is_nullable, character_maximum_length FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1",
          [table],
        );
        const { rows: checks } = await pool.query<{
          column: string;
          definition: string;
        }>(
          "SELECT a.attname AS column, pg_get_constraintdef(c.oid) AS definition FROM pg_constraint c JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1] WHERE c.conrelid = $1::regclass AND c.contype = 'c' AND array_length(c.conkey, 1) = 1",
          [table],
        );
        const described = new Set(structuralColumns[table]);
        for (const group of groups)
          for (const [name, field] of Object.entries(group)) {
            const column = columnOf(name, field);
            const at = `${table}.${column}`;
            described.add(column);
            const info = columns.find((c) => c.column_name === column);
            assert.ok(info, `${at} is missing from the database`);
            const check = checks
              .filter((c) => c.column === column)
              .map((c) => c.definition)
              .join(" ");
            switch (field.kind) {
              case "decimal": {
                assert.equal(info.data_type, "numeric", at);
                assert.equal(info.is_nullable === "NO", !!field.required, at);
                const bound = (op: string) =>
                  Number(
                    check.match(
                      new RegExp(`${op} \\('?(-?\\d+)'?(?:::integer)?\\)`),
                    )?.[1],
                  );
                assert.equal(bound(">="), field.min, `${at} minimum`);
                assert.equal(bound("<="), field.max, `${at} maximum`);
                break;
              }
              case "date":
                assert.equal(info.data_type, "date", at);
                assert.equal(info.is_nullable === "NO", !!field.required, at);
                break;
              case "enum":
                assert.equal(info.data_type, "text", at);
                assert.equal(info.is_nullable, "NO", at);
                assert.deepEqual(
                  [...check.matchAll(/'([^']+)'::text/g)].map((m) => m[1]),
                  field.values,
                  `${at} values`,
                );
                break;
              case "text":
                assert.equal(info.is_nullable, "NO", at);
                assert.equal(
                  info.character_maximum_length,
                  field.maxLength ?? null,
                  `${at} length`,
                );
                break;
              case "boolean":
                assert.equal(info.data_type, "boolean", at);
                assert.equal(info.is_nullable, "NO", at);
                break;
              default: {
                const unhandled: never = field;
                throw new Error(
                  `Unhandled field: ${JSON.stringify(unhandled)}`,
                );
              }
            }
          }
        assert.deepEqual(
          columns.map((c) => c.column_name).filter((c) => !described.has(c)),
          [],
          `${table} has columns the registry doesn't describe`,
        );
      }
    } finally {
      await pool.end();
    }
  },
);
