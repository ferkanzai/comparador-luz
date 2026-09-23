import Dashboard from "@/components/dashboard";
import HeaderActions from "@/components/header-actions";
import Hero from "@/components/hero";
import MethodText from "@/components/method-text";
import { PageProvider } from "@/components/page-context";
import SiteFooter from "@/components/site-footer";
import SiteHeader from "@/components/site-header";
import { currentUser } from "@/lib/current-user";
import { readWorkspace } from "@/lib/workspace-store";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <PageProvider method={<MethodText />}>
      <a href="#main" className="skip-link">
        Saltar al contenido
      </a>
      <SiteHeader
        actions={
          <Suspense>
            <HeaderActions />
          </Suspense>
        }
      />
      <main id="main" className="shell">
        <Suspense
          fallback={
            <div className="panel loading" role="status">
              Cargando tus tarifas y facturas…
            </div>
          }
        >
          <Workspace searchParams={searchParams} />
        </Suspense>
        <SiteFooter />
      </main>
    </PageProvider>
  );
}

async function Workspace({
  searchParams,
}: Pick<PageProps<"/">, "searchParams">) {
  if ((await searchParams).error)
    redirect("/cuenta?error=invalid-verification");
  const { user, accountsAvailable } = await currentUser();
  return (
    <Dashboard
      key={user?.id ?? "guest"}
      user={user}
      accountsAvailable={accountsAvailable}
      hero={<Hero />}
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
