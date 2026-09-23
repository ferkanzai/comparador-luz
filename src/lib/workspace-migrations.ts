import { readdir, readFile } from "node:fs/promises";
import { isDeepStrictEqual } from "node:util";
import type { Pool, PoolClient } from "pg";
import { workspaceSchema } from "./domain";
import {
  normalizeWorkspaceStorage,
  readWorkspaceRecords,
  workspaceTables,
  writeWorkspaceRecords,
} from "./workspace-records";

const migrationsDirectory = new URL("../../migrations/", import.meta.url);
const relationalMigration = "001-relational-workspaces";

type Migration = { id: string; sql: string };

/** `migrations/NNN-name.sql`, in numeric order. The id is the file name without `.sql`. */
export async function loadMigrations(): Promise<Migration[]> {
  const files = (await readdir(migrationsDirectory))
    .filter((file) => /^\d{3}-[a-z0-9-]+\.sql$/.test(file))
    .sort();
  const numbers = files.map((file) => file.slice(0, 3));
  const repeated = numbers.find((n, i) => numbers.indexOf(n) !== i);
  if (repeated) throw new Error(`Two migrations are numbered ${repeated}`);
  return Promise.all(
    files.map(async (file) => ({
      id: file.slice(0, -".sql".length),
      sql: await readFile(new URL(file, migrationsDirectory), "utf8"),
    })),
  );
}

/** Returns whether a JSON-document `workspace` table was moved aside for import. */
async function archiveLegacyTable(client: PoolClient) {
  const legacy = (
    await client.query(
      "SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'workspace' AND column_name = 'data'",
    )
  ).rowCount;
  if (!legacy) return false;
  await client.query("LOCK TABLE workspace IN ACCESS EXCLUSIVE MODE");
  await client.query("ALTER TABLE workspace RENAME TO workspace_legacy");
  // Index names survive a table rename and would collide with the new PK.
  await client.query(
    "ALTER TABLE workspace_legacy RENAME CONSTRAINT workspace_pkey TO workspace_legacy_pkey",
  );
  return true;
}

async function secureWorkspaceTables(client: PoolClient) {
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
}

type LegacyRow = {
  user_id: string;
  data: unknown;
  version: number;
  updated_at: Date;
};

/**
 * Runs after every migration, because the record writers target the latest
 * schema. The owner writes across accounts, so forced RLS is lifted meanwhile.
 */
async function importLegacyWorkspaces(client: PoolClient) {
  for (const table of workspaceTables)
    await client.query(`ALTER TABLE ${table} NO FORCE ROW LEVEL SECURITY`);
  // Page through the locked legacy table instead of loading all accounts into memory.
  let after: string | null = null;
  for (;;) {
    const { rows }: { rows: LegacyRow[] } = await client.query<LegacyRow>(
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
  await client.query("SET CONSTRAINTS ALL IMMEDIATE");
  for (const table of workspaceTables)
    await client.query(`ALTER TABLE ${table} FORCE ROW LEVEL SECURITY`);
  // Keep a read-only administrator archive for recovery, never a second live store.
  await client.query("REVOKE ALL ON workspace_legacy FROM PUBLIC");
  await client.query("ALTER TABLE workspace_legacy ENABLE ROW LEVEL SECURITY");
  await client.query("ALTER TABLE workspace_legacy FORCE ROW LEVEL SECURITY");
}

/**
 * Applies every unrecorded migration in order, in one transaction under an
 * advisory lock. Returns the ids it applied.
 */
export async function migrateWorkspaces(pool: Pool) {
  const migrations = await loadMigrations();
  const client = await pool.connect();
  let failed = false;
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(719432, 1)");
    await client.query(
      "CREATE TABLE IF NOT EXISTS app_migration (id TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())",
    );
    const recorded = new Set(
      (
        await client.query<{ id: string }>("SELECT id FROM app_migration")
      ).rows.map((row) => row.id),
    );
    const known = new Set(migrations.map((m) => m.id));
    const unknown = [...recorded].filter((id) => !known.has(id));
    if (unknown.length)
      throw new Error(
        `The database has migrations this build doesn't include (${unknown.join(", ")}). Deploy a build that includes them.`,
      );
    const applied: string[] = [];
    let legacy = false;
    for (const migration of migrations) {
      if (recorded.has(migration.id)) continue;
      if (migration.id === relationalMigration)
        legacy = await archiveLegacyTable(client);
      await client.query(migration.sql);
      if (migration.id === relationalMigration)
        await secureWorkspaceTables(client);
      await client.query("INSERT INTO app_migration (id) VALUES ($1)", [
        migration.id,
      ]);
      applied.push(migration.id);
    }
    if (legacy) await importLegacyWorkspaces(client);
    await client.query("COMMIT");
    return applied;
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
