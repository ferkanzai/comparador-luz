import { getPool } from "./db";
import { emptyWorkspace, type Workspace } from "./domain";
export async function readWorkspace(userId: string) {
  const { rows } = await getPool().query(
    "SELECT data, version FROM workspace WHERE user_id = $1",
    [userId],
  );
  return rows[0] ?? { data: emptyWorkspace(), version: 0 };
}
export async function saveWorkspace(
  userId: string,
  data: Workspace,
  version: number,
): Promise<number | null> {
  const result =
    version === 0
      ? await getPool().query(
          "INSERT INTO workspace (user_id, data, version) VALUES ($1, $2, 1) ON CONFLICT (user_id) DO NOTHING RETURNING version",
          [userId, JSON.stringify(data)],
        )
      : await getPool().query(
          "UPDATE workspace SET data = $2, version = version + 1, updated_at = now() WHERE user_id = $1 AND version = $3 RETURNING version",
          [userId, JSON.stringify(data), version],
        );
  return result.rows[0]?.version ?? null;
}
