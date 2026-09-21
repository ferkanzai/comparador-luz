import { Pool } from "pg";
const globalDb = globalThis as unknown as { luzPool?: Pool };
export function getPool() {
  if (!process.env.DATABASE_URL)
    throw new Error("DATABASE_URL is required. See docs/SETUP.md.");
  return (globalDb.luzPool ??= new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 3,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
  }));
}
