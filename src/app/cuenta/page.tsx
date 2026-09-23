import { authConfigured } from "@/lib/auth";
import AccountForm from "@/components/account-form";
export const dynamic = "force-dynamic";
export default async function Account({ searchParams }: PageProps<"/cuenta">) {
  const params = await searchParams;
  const text = (value: string | string[] | undefined) =>
    typeof value === "string" ? value : undefined;
  return (
    <AccountForm
      configured={authConfigured()}
      mode={text(params.mode)}
      token={text(params.token)}
      verificationError={text(params.error)}
      deleted={text(params.eliminada) === "1"}
    />
  );
}
