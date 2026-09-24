import Link from "next/link";
import { Zap } from "lucide-react";
import { MethodButton } from "./page-context";

export default function SiteFooter() {
  return (
    <footer className="mt-5 flex justify-between gap-4 border-t border-border py-7 text-sm/[1.6] text-muted-foreground max-[800px]:flex-wrap max-[520px]:mt-6 max-[520px]:gap-3.5 max-[520px]:pt-6">
      <span className="flex items-center gap-2">
        <Zap size={13} className="shrink-0" /> Luz en claro{" "}
        <span className="px-1.5 text-inverse-muted">/</span> Entender también es
        ahorrar.
      </span>
      <div className="flex items-center gap-6 max-[520px]:w-full max-[520px]:justify-between max-[520px]:gap-2.5">
        <MethodButton />
        <Link href="/privacidad">Privacidad</Link>
        <span>Hecho para hogares en España</span>
      </div>
    </footer>
  );
}
