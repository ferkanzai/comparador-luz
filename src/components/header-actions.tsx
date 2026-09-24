import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { currentUser } from "@/lib/current-user";
import SignOutButton from "./sign-out-button";
import { Button } from "@/components/ui/button";

export default async function HeaderActions() {
  const { user } = await currentUser();
  if (user)
    return (
      <>
        <Link
          className="text-base/[1.6] hover:underline hover:underline-offset-3 max-[520px]:truncate min-[801px]:text-sm-plus/[1.6]"
          href="/mi-cuenta"
          title="Mi cuenta"
        >
          Hola{user.name ? `, ${user.name.split(" ")[0]}` : ""}
        </Link>
        <SignOutButton />
      </>
    );
  return (
    <>
      <Button
        asChild
        variant="link"
        size="inline"
        className="max-[520px]:min-h-11 max-[520px]:min-w-11"
      >
        <Link href="/cuenta" aria-label="Iniciar sesión">
          <span className="max-[520px]:hidden">Iniciar sesión</span>
          <span className="hidden max-[520px]:inline">Entrar</span>
        </Link>
      </Button>
      <Button asChild variant="inverse" size="sm">
        <Link href="/cuenta?mode=signup">
          Crear cuenta
          <ArrowUpRight size={15} />
        </Link>
      </Button>
    </>
  );
}
