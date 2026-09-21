import nextEnv from "@next/env";
import { getMigrations } from "better-auth/db/migration";
import { getAuth } from "../src/lib/auth";
import { getPool } from "../src/lib/db";
import { migrateWorkspaces } from "../src/lib/workspace-migrations";
nextEnv.loadEnvConfig(process.cwd());
try {
  const { runMigrations } = await getMigrations(getAuth().options);
  await runMigrations();
  await migrateWorkspaces(getPool());
  console.info("Auth and relational workspace schema ready.");
} finally {
  await getPool().end();
}
