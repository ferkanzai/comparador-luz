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
        <Link className="user-name" href="/mi-cuenta" title="Mi cuenta">
          Hola{user.name ? `, ${user.name.split(" ")[0]}` : ""}
        </Link>
        <SignOutButton />
      </>
    );
  return (
    <>
      <Button asChild variant="link" size="inline" className="login-link">
        <Link href="/cuenta" aria-label="Iniciar sesión">
          <span className="login-label-desktop">Iniciar sesión</span>
          <span className="login-label-mobile">Entrar</span>
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
