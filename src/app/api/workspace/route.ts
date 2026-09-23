import { withAccount } from "@/db";
import { readWorkspace } from "@/db/workspace";
import { json, reloadMessage, sessionUser } from "@/lib/account-api";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { id, cookies } = await sessionUser(request, true);
    if (!id)
      return json(
        { error: "Inicia sesión para acceder a tus datos." },
        401,
        cookies,
      );
    const data = await withAccount(id, "read", (tx) => readWorkspace(tx, id));
    return json({ data }, 200, cookies);
  } catch {
    return json(
      { error: "No se han podido cargar tus datos. Inténtalo de nuevo." },
      503,
    );
  }
}
// Builds from before per-record saves sent the whole workspace here.
export function PUT() {
  return json({ error: reloadMessage }, 426);
}
