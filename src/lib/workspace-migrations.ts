import { readFile } from "node:fs/promises";
import { isDeepStrictEqual } from "node:util";
import type { Pool, PoolClient } from "pg";
import { workspaceSchema } from "./domain";
import {
  normalizeWorkspaceStorage,
  readWorkspaceRecords,
  workspaceTables,
  writeWorkspaceRecords,
} from "./workspace-records";

async function removeInvoicePriceLines(client: PoolClient) {
  if (
    (
      await client.query(
        "SELECT 1 FROM app_migration WHERE id = '002-remove-invoice-price-lines'",
      )
    ).rowCount
  )
    return;
  await client.query(
    await readFile(
      new URL(
        "../../migrations/002-remove-invoice-price-lines.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  await client.query(
    "INSERT INTO app_migration (id) VALUES ('002-remove-invoice-price-lines')",
  );
}

async function addSnoeeCost(client: PoolClient) {
  if (
    (
      await client.query(
        "SELECT 1 FROM app_migration WHERE id = '003-snoee-cost'",
      )
    ).rowCount
  )
    return;
  await client.query(
    await readFile(
      new URL("../../migrations/003-snoee-cost.sql", import.meta.url),
      "utf8",
    ),
  );
  await client.query(
    "INSERT INTO app_migration (id) VALUES ('003-snoee-cost')",
  );
}

/** Needs the luz_workspace role, so it runs after 001 on fresh databases. */
async function addSaveRate(client: PoolClient) {
  if (
    (
      await client.query(
        "SELECT 1 FROM app_migration WHERE id = '004-workspace-save-rate'",
      )
    ).rowCount
  )
    return;
  await client.query(
    await readFile(
      new URL("../../migrations/004-workspace-save-rate.sql", import.meta.url),
      "utf8",
    ),
  );
  await client.query(
    "INSERT INTO app_migration (id) VALUES ('004-workspace-save-rate')",
  );
}

export async function migrateWorkspaces(pool: Pool) {
  const client = await pool.connect();
  let failed = false;
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(719432, 1)");
    await client.query(
      "CREATE TABLE IF NOT EXISTS app_migration (id TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())",
    );
    if (
      (
        await client.query(
          "SELECT 1 FROM app_migration WHERE id = '001-relational-workspaces'",
        )
      ).rowCount
    ) {
      await removeInvoicePriceLines(client);
      await addSnoeeCost(client);
      await addSaveRate(client);
      await client.query("COMMIT");
      return;
    }
    const legacy = (
      await client.query(
        "SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'workspace' AND column_name = 'data'",
      )
    ).rowCount;
    if (legacy) {
      await client.query("LOCK TABLE workspace IN ACCESS EXCLUSIVE MODE");
      await client.query("ALTER TABLE workspace RENAME TO workspace_legacy");
      // Index names survive a table rename and would collide with the new PK.
      await client.query(
        "ALTER TABLE workspace_legacy RENAME CONSTRAINT workspace_pkey TO workspace_legacy_pkey",
      );
    }
    await client.query(
      await readFile(
        new URL(
          "../../migrations/001-relational-workspaces.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    // The record readers/writers use these columns during the legacy import too.
    await addSnoeeCost(client);
    if (legacy) {
      // Page through the locked legacy table instead of loading all accounts into memory.
      let after: string | null = null;
      for (;;) {
        const {
          rows,
        }: {
          rows: {
            user_id: string;
            data: unknown;
            version: number;
            updated_at: Date;
          }[];
        } = await client.query<{
          user_id: string;
          data: unknown;
          version: number;
          updated_at: Date;
        }>(
          "SELECT user_id, data, version, updated_at FROM workspace_legacy WHERE ($1::text IS NULL OR user_id > $1) ORDER BY user_id LIMIT 100",
          [after],
        );
        if (!rows.length) break;
        for (const row of rows) {
          const parsed = workspaceSchema.safeParse(row.data);
          if (!parsed.success)
            throw new Error(
              `Legacy workspace ${row.user_id} failed validation; migration rolled back`,
            );
          const data = normalizeWorkspaceStorage(parsed.data);
          await client.query(
            "INSERT INTO workspace (user_id, version, updated_at) VALUES ($1, $2, $3)",
            [row.user_id, row.version, row.updated_at],
          );
          await writeWorkspaceRecords(client, row.user_id, data);
          const restored = await readWorkspaceRecords(client, row.user_id);
          if (
            restored.version !== row.version ||
            !isDeepStrictEqual(data, restored.data)
          )
            throw new Error(
              `Legacy workspace ${row.user_id} did not round-trip; migration rolled back`,
            );
        }
        after = rows.at(-1)!.user_id;
      }
      // Keep a read-only administrator archive for recovery, never a second live store.
      await client.query("REVOKE ALL ON workspace_legacy FROM PUBLIC");
      await client.query(
        "ALTER TABLE workspace_legacy ENABLE ROW LEVEL SECURITY",
      );
      await client.query(
        "ALTER TABLE workspace_legacy FORCE ROW LEVEL SECURITY",
      );
    }
    await client.query("SET CONSTRAINTS ALL IMMEDIATE");
    await client.query(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'luz_workspace') THEN
        CREATE ROLE luz_workspace NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS;
      END IF;
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'luz_workspace' AND (rolsuper OR rolbypassrls OR rolcanlogin OR rolcreaterole OR rolcreatedb OR rolreplication)) OR EXISTS (SELECT 1 FROM pg_auth_members WHERE member = (SELECT oid FROM pg_roles WHERE rolname = 'luz_workspace')) THEN
        RAISE EXCEPTION 'luz_workspace must be an unprivileged NOLOGIN role without memberships';
      END IF;
      EXECUTE format('GRANT luz_workspace TO %I', current_user);
    END $$`);
    await client.query("GRANT USAGE ON SCHEMA public TO luz_workspace");
    for (const table of workspaceTables) {
      await client.query(`REVOKE ALL ON ${table} FROM PUBLIC`);
      await client.query(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`);
      await client.query(`ALTER TABLE ${table} FORCE ROW LEVEL SECURITY`);
      await client.query(
        `CREATE POLICY workspace_owner ON ${table} TO luz_workspace USING (user_id = NULLIF(current_setting('app.user_id', true), '')) WITH CHECK (user_id = NULLIF(current_setting('app.user_id', true), ''))`,
      );
      await client.query(
        `GRANT SELECT, INSERT, UPDATE, DELETE ON ${table} TO luz_workspace`,
      );
    }
    await client.query(
      "INSERT INTO app_migration (id) VALUES ('001-relational-workspaces')",
    );
    await removeInvoicePriceLines(client);
    await addSaveRate(client);
    await client.query("COMMIT");
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      failed = true;
    }
    throw error;
  } finally {
    client.release(failed);
  }
}
