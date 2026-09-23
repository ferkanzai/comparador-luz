import nextEnv from "@next/env";
import { getMigrations } from "better-auth/db/migration";
import { authOptions } from "../src/lib/auth";
import { getPool } from "../src/lib/db";
import { migrateWorkspaces } from "../src/lib/workspace-migrations";
nextEnv.loadEnvConfig(process.cwd());
const pool = getPool();
// Serializes concurrent deployments across both schemas. Better Auth migrates
// on its own connections, so this is a session lock on a dedicated client.
const lock = await pool.connect();
try {
  await lock.query("SELECT pg_advisory_lock(719432, 0)");
  // Planning from the options avoids initializing Better Auth, whose schema
  // check logs "Missing tables" on a database it is about to create.
  const auth = await getMigrations(authOptions());
  const created = auth.toBeCreated.map((table) => table.table);
  const extended = auth.toBeAdded.map((table) => table.table);
  if (created.length)
    console.info(`Creating auth tables: ${created.join(", ")}`);
  if (extended.length)
    console.info(`Adding auth columns to: ${extended.join(", ")}`);
  await auth.runMigrations();
  const applied = await migrateWorkspaces(pool);
  console.info(
    applied.length
      ? `Applied workspace migrations: ${applied.join(", ")}`
      : "Workspace schema already up to date.",
  );
  console.info("Auth and relational workspace schema ready.");
} finally {
  await lock.query("SELECT pg_advisory_unlock_all()").catch(() => {});
  lock.release();
  await pool.end();
}
