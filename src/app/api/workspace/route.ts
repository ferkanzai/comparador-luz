import { z } from "zod";
import { authConfigured, getAuth } from "@/lib/auth";
import { authOrigins } from "@/lib/auth-origins";
import { maxWorkspaceRequestBytes, workspaceSchema } from "@/lib/domain";
import {
  consumeSaveAllowance,
  readWorkspace,
  saveWorkspace,
  workspaceSaveLimit,
} from "@/lib/workspace-store";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Session lookups may refresh the session and its cookie cache; forward those cookies.
const json = (
  body: unknown,
  status = 200,
  cookies: string[] = [],
  extra: Record<string, string> = {},
) => {
  const headers = new Headers({
    "Cache-Control": "private, no-store",
    ...extra,
  });
  for (const cookie of cookies) headers.append("Set-Cookie", cookie);
  return Response.json(body, { status, headers });
};
async function user(request: Request, cookieCache: boolean) {
  if (!authConfigured()) return { id: null, cookies: [] };
  const { headers, response } = await getAuth().api.getSession({
    headers: request.headers,
    query: { disableCookieCache: !cookieCache },
    returnHeaders: true,
  });
  return { id: response?.user.id ?? null, cookies: headers.getSetCookie() };
}
export async function GET(request: Request) {
  try {
    const { id, cookies } = await user(request, true);
    if (!id)
      return json(
        { error: "Inicia sesión para acceder a tus datos." },
        401,
        cookies,
      );
    return json(await readWorkspace(id), 200, cookies);
  } catch {
    return json(
      { error: "No se han podido cargar tus datos. Inténtalo de nuevo." },
      503,
    );
  }
}
export async function PUT(request: Request) {
  // Use the same exact origins as authentication, including this deployment's preview.
  if (!authOrigins().origins.includes(request.headers.get("origin") ?? ""))
    return json({ error: "Origen no permitido." }, 403);
  try {
    // Always from the database, so sign-out and password resets stop saves immediately.
    const { id, cookies } = await user(request, false);
    const reply = (body: unknown, status: number) =>
      json(body, status, cookies);
    if (!id)
      return reply(
        { error: "Tu sesión ha caducado. Inicia sesión de nuevo." },
        401,
      );
    if (!request.headers.get("content-type")?.includes("application/json"))
      return reply({ error: "Formato no válido." }, 415);
    // Before reading the body, so a flood of saves never reaches parsing.
    if (!(await consumeSaveAllowance(id)))
      return json(
        {
          error:
            "Demasiados guardados seguidos. Tus cambios siguen aquí; lo reintentaremos en breve.",
        },
        429,
        cookies,
        { "Retry-After": String(workspaceSaveLimit.windowSeconds) },
      );
    // Bound the actual streamed body, including requests without Content-Length.
    const reader = request.body?.getReader();
    if (!reader) return reply({ error: "Faltan datos." }, 400);
    const chunks: Uint8Array[] = [];
    let length = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maxWorkspaceRequestBytes) {
        await reader.cancel();
        return reply({ error: "Demasiados datos (máximo 4 MB)." }, 413);
      }
      chunks.push(value);
    }
    let body: unknown;
    try {
      body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch {
      return reply({ error: "JSON no válido." }, 400);
    }
    // The only schema pass per save; saveWorkspace trusts this output.
    const parsed = z
      .object({ data: workspaceSchema, version: z.number().int().min(0) })
      .safeParse(body);
    if (!parsed.success)
      return reply(
        { error: parsed.error.issues[0]?.message ?? "Revisa los datos." },
        400,
      );
    const version = await saveWorkspace(
      id,
      parsed.data.data,
      parsed.data.version,
    );
    if (version === null)
      return reply(
        {
          error:
            "Hay cambios guardados desde otra pestaña. Exporta tus cambios y recarga antes de continuar.",
        },
        409,
      );
    return reply({ version }, 200);
  } catch {
    return json(
      {
        error:
          "No se han guardado los cambios. Revisa tu conexión y vuelve a intentarlo.",
      },
      503,
    );
  }
}
