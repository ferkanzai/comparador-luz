import nextEnv from "@next/env";
import { getMigrations } from "better-auth/db/migration";
import { getAuth } from "../src/lib/auth";
import { getPool } from "../src/lib/db";
nextEnv.loadEnvConfig(process.cwd());
try {
  const { runMigrations } = await getMigrations(getAuth().options);
  await runMigrations();
  await getPool().query(`CREATE TABLE IF NOT EXISTS workspace (
    user_id TEXT PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
    data JSONB NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);
  console.info("Auth and workspace schema ready.");
} finally {
  await getPool().end();
}
