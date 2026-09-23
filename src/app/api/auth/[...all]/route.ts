import { authConfigured, getAuth } from "@/lib/auth";
async function handle(request: Request) {
  // Read the request first so a build without auth can't prerender the 503.
  void request.headers;
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
