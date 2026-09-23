import Dashboard from "@/components/dashboard";
import HeaderActions from "@/components/header-actions";
import Hero from "@/components/hero";
import MethodText from "@/components/method-text";
import { PageProvider } from "@/components/page-context";
import QueryProvider from "@/components/query-provider";
import SiteFooter from "@/components/site-footer";
import SiteHeader from "@/components/site-header";
import { currentUser } from "@/lib/current-user";
import { withAccount } from "@/db";
import { readWorkspace } from "@/db/workspace";
import { redirect } from "next/navigation";

// Rendered whole per request: a prerendered shell with streamed content
// shifted the layout when the hero and workspace arrived.
export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: PageProps<"/">) {
  if ((await searchParams).error)
    redirect("/cuenta?error=invalid-verification");
  const { user, accountsAvailable } = await currentUser();
  return (
    <PageProvider method={<MethodText />}>
      <a href="#main" className="skip-link">
        Saltar al contenido
      </a>
      <SiteHeader actions={<HeaderActions />} />
      <main id="main" className="shell">
        <QueryProvider>
          <Dashboard
            key={user?.id ?? "guest"}
            user={user}
            accountsAvailable={accountsAvailable}
            hero={<Hero />}
            initialWorkspace={
              user
                ? withAccount(user.id, "read", (tx) =>
                    readWorkspace(tx, user.id),
                  )
                    .then((data) => ({ data }))
                    .catch(() => ({
                      error:
                        "No se han podido cargar tus datos. Inténtalo de nuevo.",
                    }))
                : undefined
            }
          />
        </QueryProvider>
        <SiteFooter />
      </main>
    </PageProvider>
  );
}
