import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { authConfigured, getAuth } from "@/lib/auth";
import Dashboard from "@/components/dashboard";
import { readWorkspace } from "@/lib/workspace-store";
export const dynamic = "force-dynamic";
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if ((await searchParams).error)
    redirect("/cuenta?error=invalid-verification");
  const configured = authConfigured();
  let user: {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
  } | null = null;
  let unavailable = false;
  if (configured) {
    try {
      const session = await getAuth().api.getSession({
        headers: await headers(),
      });
      user = session?.user ?? null;
    } catch {
      unavailable = true;
    }
  }
  return (
    <Dashboard
      key={user?.id ?? "guest"}
      user={user}
      accountsAvailable={configured && !unavailable}
      initialWorkspace={
        user
          ? readWorkspace(user.id).catch(() => ({
              error: "No se han podido cargar tus datos. Inténtalo de nuevo.",
            }))
          : undefined
      }
    />
  );
}
