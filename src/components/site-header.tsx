import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Brand } from "./ui";

export default function SiteHeader({
  userName,
  signOut,
}: {
  userName: string | null;
  signOut?: ReactNode;
}) {
  return (
    <header className="site-header">
      <div className="header-inner">
        <Brand />
        <span className="header-tag">TU ELECTRICIDAD, BAJO CONTROL</span>
        <div className="header-actions">
          {userName !== null ? (
            <>
              <span className="user-name">
                Hola{userName ? `, ${userName.split(" ")[0]}` : ""}
              </span>
              {signOut}
            </>
          ) : (
            <>
              <Link
                className="text-link login-link"
                href="/cuenta"
                aria-label="Iniciar sesión"
              >
                <span className="login-label-desktop">Iniciar sesión</span>
                <span className="login-label-mobile">Entrar</span>
              </Link>
              <Link
                className="button dark small-button"
                href="/cuenta?mode=signup"
              >
                Crear cuenta
                <ArrowUpRight size={15} />
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
