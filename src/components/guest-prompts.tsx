import Link from "next/link";
import { ArrowRight, History, Receipt } from "lucide-react";
import { Empty } from "./ui";
import { Button } from "@/components/ui/button";

export function SignupBanner() {
  return (
    <section className="signup-banner">
      <div className="signup-icon">
        <History size={25} />
      </div>
      <div>
        <h3>Tus datos, también en otros dispositivos.</h3>
        <p>
          Crea una cuenta para sincronizar tus tarifas y seguir tus facturas mes
          a mes. Sin cuenta, tu comparación se conserva en este navegador.
        </p>
      </div>
      <Button asChild variant="inverse">
        <Link href="/cuenta?mode=signup">
          Crear mi cuenta
          <ArrowRight size={17} />
        </Link>
      </Button>
    </section>
  );
}

export function AccountRequired({ section }: { section: "history" | "bills" }) {
  return (
    <div className="panel">
      <Empty
        icon={
          section === "history" ? <History size={27} /> : <Receipt size={27} />
        }
        title={
          section === "history"
            ? "Tu historia con la luz, en un solo lugar."
            : "Pon tus facturas en perspectiva."
        }
        action={
          <Button asChild>
            <Link href="/cuenta?mode=signup">
              Crear una cuenta
              <ArrowRight size={16} />
            </Link>
          </Button>
        }
      >
        Inicia sesión para guardar tus tarifas y registrar lo que pagas cada
        mes. El comparador es libre y no necesita cuenta.
      </Empty>
    </div>
  );
}
