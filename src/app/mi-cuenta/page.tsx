import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import AccountSettings from "@/components/account-settings";
import HeaderActions from "@/components/header-actions";
import MethodText from "@/components/method-text";
import { PageProvider } from "@/components/page-context";
import SiteFooter from "@/components/site-footer";
import SiteHeader from "@/components/site-header";
import { getAuth } from "@/lib/auth";
import { currentUser } from "@/lib/current-user";
import { shell, skipLink } from "@/components/shell-styles";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Mi cuenta · Luz en claro" };

export default async function MyAccount() {
  const { user } = await currentUser();
  if (!user) redirect("/cuenta");
  const accounts = await getAuth().api.listUserAccounts({
    headers: await headers(),
  });
  return (
    <PageProvider method={<MethodText />}>
      <a href="#main" className={skipLink}>
        Saltar al contenido
      </a>
      <SiteHeader actions={<HeaderActions />} />
      <main id="main" className={shell}>
        <AccountSettings
          user={user}
          hasPassword={accounts.some((a) => a.providerId === "credential")}
        />
        <SiteFooter />
      </main>
    </PageProvider>
  );
}
