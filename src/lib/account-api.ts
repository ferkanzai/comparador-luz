import { sql } from "drizzle-orm";
import type * as z from "zod";
import { withAccount } from "../db";
import { ensureWorkspace, readWorkspace, writeChanges } from "../db/workspace";
import { authConfigured, getAuth } from "./auth";
import { authOrigins } from "./auth-origins";
import {
  appSchemaHeader,
  appSchemaVersion,
  maxWorkspaceRequestBytes,
  workspaceSchema,
  type Workspace,
} from "./domain";
import { describeWorkspaceIssue } from "./sync-status";

// Session lookups may refresh the session and its cookie cache; forward those cookies.
export function json(
  body: unknown,
  status = 200,
  cookies: string[] = [],
  extra: Record<string, string> = {},
) {
  const headers = new Headers({
    "Cache-Control": "private, no-store",
    ...extra,
  });
  for (const cookie of cookies) headers.append("Set-Cookie", cookie);
  return Response.json(body, { status, headers });
}

export async function sessionUser(request: Request, cookieCache: boolean) {
  if (!authConfigured()) return { id: null, cookies: [] };
  const { headers, response } = await getAuth().api.getSession({
    headers: request.headers,
    query: { disableCookieCache: !cookieCache },
    returnHeaders: true,
  });
  return { id: response?.user.id ?? null, cookies: headers.getSetCookie() };
}

export const saveLimit = { max: 60, windowSeconds: 60 };

/** Counts one save; false once the account exceeds its per-minute allowance. */
export async function consumeSaveAllowance(userId: string): Promise<boolean> {
  return withAccount(userId, "write", async (tx) => {
    const { rows } = await tx.execute<{ count: number }>(
      sql`INSERT INTO save_rate (user_id, window_start, count) VALUES (${userId}, now(), 1)
       ON CONFLICT (user_id) DO UPDATE SET
         window_start = CASE WHEN save_rate.window_start <= now() - make_interval(secs => ${saveLimit.windowSeconds}) THEN now() ELSE save_rate.window_start END,
         count = CASE WHEN save_rate.window_start <= now() - make_interval(secs => ${saveLimit.windowSeconds}) THEN 1 ELSE save_rate.count + 1 END
       RETURNING count`,
    );
    return rows[0].count <= saveLimit.max;
  });
}

/** Reads the streamed body up to the size limit, including requests without Content-Length. */
async function readBody(request: Request): Promise<unknown | "too-large"> {
  const reader = request.body?.getReader();
  if (!reader) return undefined;
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > maxWorkspaceRequestBytes) {
      await reader.cancel();
      return "too-large";
    }
    chunks.push(value);
  }
  if (!length) return undefined;
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

export const reloadMessage =
  "Hay una versión nueva de la aplicación. Recarga la página para seguir guardando.";

/**
 * A save endpoint: it runs `action`, one of the pure workspace actions, on the
 * account's workspace, checks the result against the workspace rules, and
 * writes only what changed, all in one transaction. The last save wins.
 */
export function mutation<B, P = Record<string, never>>(
  body: z.ZodType<B> | null,
  action: (w: Workspace, body: B, params: P) => Workspace,
) {
  return async (
    request: Request,
    context?: { params: Promise<P> },
  ): Promise<Response> => {
    // The same exact origins as authentication, including this deployment's preview.
    if (!authOrigins().origins.includes(request.headers.get("origin") ?? ""))
      return json({ error: "Origen no permitido." }, 403);
    try {
      // Always from the database, so sign-out and password resets stop saves immediately.
      const { id, cookies } = await sessionUser(request, false);
      const reply = (value: unknown, status = 200) =>
        json(value, status, cookies);
      if (!id)
        return reply(
          { error: "Tu sesión ha caducado. Inicia sesión de nuevo." },
          401,
        );
      if (Number(request.headers.get(appSchemaHeader)) < appSchemaVersion)
        return reply({ error: reloadMessage }, 426);
      if (
        body &&
        !request.headers.get("content-type")?.includes("application/json")
      )
        return reply({ error: "Formato no válido." }, 415);
      // Before reading the body, so a flood of saves never reaches parsing.
      if (!(await consumeSaveAllowance(id)))
        return json(
          { error: "Demasiados guardados seguidos. Espera un momento." },
          429,
          cookies,
          { "Retry-After": String(saveLimit.windowSeconds) },
        );
      let input: unknown;
      try {
        input = await readBody(request);
      } catch {
        return reply({ error: "JSON no válido." }, 400);
      }
      if (input === "too-large")
        return reply({ error: "Demasiados datos (máximo 4 MB)." }, 413);
      const parsed = body?.safeParse(input);
      if (parsed && !parsed.success)
        return reply(
          { error: parsed.error.issues[0]?.message ?? "Revisa los datos." },
          400,
        );
      const params = (await context?.params) ?? ({} as P);
      const refused = await withAccount(id, "write", async (tx) => {
        await ensureWorkspace(tx, id);
        const before = await readWorkspace(tx, id);
        let after: Workspace;
        try {
          after = action(before, parsed?.data as B, params);
        } catch (error) {
          // Workspace actions explain in Spanish why they can't apply.
          return error instanceof Error ? error.message : "Revisa los datos.";
        }
        const valid = workspaceSchema.safeParse(after);
        if (!valid.success)
          return describeWorkspaceIssue(after, valid.error.issues[0]);
        await writeChanges(tx, id, before, valid.data);
        return "";
      });
      return refused ? reply({ error: refused }, 422) : reply({});
    } catch {
      return json(
        {
          error:
            "No se han guardado los cambios. Revisa tu conexión y vuelve a intentarlo.",
        },
        503,
      );
    }
  };
}
