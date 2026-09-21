import { authConfigured } from "@/lib/auth";
import AccountForm from "@/components/account-form";
export const dynamic = "force-dynamic";
export default async function Account({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; token?: string; error?: string }>;
}) {
  const params = await searchParams;
  return (
    <AccountForm
      configured={authConfigured()}
      mode={params.mode}
      token={params.token}
      verificationError={params.error}
    />
  );
}
