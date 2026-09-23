import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { currentUser } from "@/lib/current-user";
import SignOutButton from "./sign-out-button";

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
      <Link
        className="text-link login-link"
        href="/cuenta"
        aria-label="Iniciar sesión"
      >
        <span className="login-label-desktop">Iniciar sesión</span>
        <span className="login-label-mobile">Entrar</span>
      </Link>
      <Link className="button dark small-button" href="/cuenta?mode=signup">
        Crear cuenta
        <ArrowUpRight size={15} />
      </Link>
    </>
  );
}
