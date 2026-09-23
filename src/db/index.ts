import { sql } from "drizzle-orm";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { getPool } from "../lib/db";
import * as schema from "./schema";

export type Database = NodePgDatabase<typeof schema>;
export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

const globalDb = globalThis as unknown as { luzDatabase?: Database };
export function database(): Database {
  return (globalDb.luzDatabase ??= drizzle({ client: getPool(), schema }));
}

/**
 * Runs `run` as the restricted `luz_workspace` role for one account. Role and
 * identity are transaction-local, so pooled connections never keep a user, and
 * row-level security hides every other account's rows.
 */
export async function withAccount<T>(
  userId: string,
  access: "read" | "write",
  run: (tx: Transaction) => Promise<T>,
): Promise<T> {
  if (!userId) throw new Error("A session user is required");
  return database().transaction(
    async (tx) => {
      await tx.execute(sql`SET LOCAL ROLE luz_workspace`);
      await tx.execute(sql`SELECT set_config('app.user_id', ${userId}, true)`);
      return run(tx);
    },
    access === "read"
      ? { isolationLevel: "repeatable read", accessMode: "read only" }
      : undefined,
  );
}
