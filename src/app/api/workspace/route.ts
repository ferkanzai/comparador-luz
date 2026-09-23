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
const json = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
async function user(request: Request) {
  // Read the request first so a build without auth can't prerender the 401.
  const headers = request.headers;
  if (!authConfigured()) return null;
  const session = await getAuth().api.getSession({ headers });
  return session?.user.id ?? null;
}
export async function GET(request: Request) {
  try {
    const id = await user(request);
    if (!id)
      return json({ error: "Inicia sesión para acceder a tus datos." }, 401);
    return json(await readWorkspace(id));
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
    const id = await user(request);
    if (!id)
      return json(
        { error: "Tu sesión ha caducado. Inicia sesión de nuevo." },
        401,
      );
    if (!request.headers.get("content-type")?.includes("application/json"))
      return json({ error: "Formato no válido." }, 415);
    // Before reading the body, so a flood of saves never reaches parsing.
    if (!(await consumeSaveAllowance(id)))
      return Response.json(
        {
          error:
            "Demasiados guardados seguidos. Tus cambios siguen aquí; lo reintentaremos en breve.",
        },
        {
          status: 429,
          headers: {
            "Cache-Control": "private, no-store",
            "Retry-After": String(workspaceSaveLimit.windowSeconds),
          },
        },
      );
    // Bound the actual streamed body, including requests without Content-Length.
    const reader = request.body?.getReader();
    if (!reader) return json({ error: "Faltan datos." }, 400);
    const chunks: Uint8Array[] = [];
    let length = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maxWorkspaceRequestBytes) {
        await reader.cancel();
        return json({ error: "Demasiados datos (máximo 4 MB)." }, 413);
      }
      chunks.push(value);
    }
    let body: unknown;
    try {
      body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch {
      return json({ error: "JSON no válido." }, 400);
    }
    // The only schema pass per save; saveWorkspace trusts this output.
    const parsed = z
      .object({ data: workspaceSchema, version: z.number().int().min(0) })
      .safeParse(body);
    if (!parsed.success)
      return json(
        { error: parsed.error.issues[0]?.message ?? "Revisa los datos." },
        400,
      );
    const version = await saveWorkspace(
      id,
      parsed.data.data,
      parsed.data.version,
    );
    if (version === null)
      return json(
        {
          error:
            "Hay cambios guardados desde otra pestaña. Exporta tus cambios y recarga antes de continuar.",
        },
        409,
      );
    return json({ version });
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
