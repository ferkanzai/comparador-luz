import Link from "next/link";
import { Zap } from "lucide-react";
import { MethodButton } from "./page-context";

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <span>
        <Zap size={13} /> Luz en claro{" "}
        <span className="footer-separator">/</span> Entender también es ahorrar.
      </span>
      <div>
        <MethodButton />
        <Link href="/privacidad">Privacidad</Link>
        <span>Hecho para hogares en España</span>
      </div>
    </footer>
  );
}
