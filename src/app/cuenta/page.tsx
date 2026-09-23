import { Suspense } from "react";
import { authConfigured } from "@/lib/auth";
import AccountForm from "@/components/account-form";

export default function Account({ searchParams }: PageProps<"/cuenta">) {
  return (
    <Suspense>
      <AccountPage searchParams={searchParams} />
    </Suspense>
  );
}

async function AccountPage({
  searchParams,
}: Pick<PageProps<"/cuenta">, "searchParams">) {
  const params = await searchParams;
  const text = (value: string | string[] | undefined) =>
    typeof value === "string" ? value : undefined;
  return (
    <AccountForm
      configured={authConfigured()}
      mode={text(params.mode)}
      token={text(params.token)}
      verificationError={text(params.error)}
    />
  );
}
