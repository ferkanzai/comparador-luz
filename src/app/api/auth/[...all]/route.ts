import { authConfigured, getAuth } from "@/lib/auth";
export const runtime = "nodejs";
async function handle(request: Request) {
  if (!authConfigured())
    return Response.json(
      {
        message:
          "Las cuentas aún no están configuradas. Puedes comparar sin iniciar sesión.",
      },
      { status: 503 },
    );
  return getAuth().handler(request);
}
export { handle as GET, handle as POST };
