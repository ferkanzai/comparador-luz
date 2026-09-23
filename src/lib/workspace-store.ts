import type { PoolClient } from "pg";
import { getPool } from "./db";
import type { Workspace } from "./domain";
import {
  normalizeWorkspaceStorage,
  readWorkspaceRecords,
  writeWorkspaceRecords,
} from "./workspace-records";

/** Role and identity are transaction-local, so pooled connections never retain a user. */
export async function withWorkspaceTransaction<T>(
  userId: string,
  readOnly: boolean,
  run: (client: PoolClient) => Promise<T>,
): Promise<T> {
  if (!userId) throw new Error("A session user is required");
  const client = await getPool().connect();
  let failed = false;
  try {
    await client.query(
      readOnly ? "BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY" : "BEGIN",
    );
    // This NOLOGIN role has no ownership, auth-table access, or BYPASSRLS privilege.
    await client.query("SET LOCAL ROLE luz_workspace");
    await client.query("SELECT set_config('app.user_id', $1, true)", [userId]);
    const result = await run(client);
    await client.query("COMMIT");
    return result;
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
export async function readWorkspace(userId: string) {
  return withWorkspaceTransaction(userId, true, (client) =>
    readWorkspaceRecords(client, userId),
  );
}
export const workspaceSaveLimit = { max: 60, windowSeconds: 60 };

/** Counts one save attempt; false once the account exceeds its per-minute allowance. */
export async function consumeSaveAllowance(userId: string): Promise<boolean> {
  return withWorkspaceTransaction(userId, false, async (client) => {
    const { rows } = await client.query<{ count: number }>(
      `INSERT INTO workspace_save_rate (user_id, window_start, count) VALUES ($1, now(), 1)
       ON CONFLICT (user_id) DO UPDATE SET
         window_start = CASE WHEN workspace_save_rate.window_start <= now() - make_interval(secs => $2) THEN now() ELSE workspace_save_rate.window_start END,
         count = CASE WHEN workspace_save_rate.window_start <= now() - make_interval(secs => $2) THEN 1 ELSE workspace_save_rate.count + 1 END
       RETURNING count`,
      [userId, workspaceSaveLimit.windowSeconds],
    );
    return rows[0].count <= workspaceSaveLimit.max;
  });
}

/** `input` must be the output of `workspaceSchema`; the API route validates it once. */
export async function saveWorkspace(
  userId: string,
  input: Workspace,
  version: number,
): Promise<number | null> {
  const data = normalizeWorkspaceStorage(input);
  if (!Number.isSafeInteger(version) || version < 0)
    throw new Error("Invalid workspace version");
  return withWorkspaceTransaction(userId, false, async (client) => {
    const result =
      version === 0
        ? await client.query(
            "INSERT INTO workspace (user_id, version) VALUES ($1, 1) ON CONFLICT (user_id) DO NOTHING RETURNING version",
            [userId],
          )
        : await client.query(
            "UPDATE workspace SET version = version + 1, updated_at = now() WHERE user_id = $1 AND version = $2 RETURNING version",
            [userId, version],
          );
    if (!result.rows.length) return null;
    await writeWorkspaceRecords(client, userId, data);
    return result.rows[0].version;
  });
}
