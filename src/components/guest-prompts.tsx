import Link from "next/link";
import { ArrowRight, History, Receipt } from "lucide-react";
import { Empty } from "./ui";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function SignupBanner() {
  return (
    <section className="mt-8 flex items-center gap-5 rounded-lg border border-muted-strong bg-accent px-7 py-6 max-[1000px]:p-6 max-[520px]:flex-col max-[520px]:items-start">
      <div className="grid size-[43px] shrink-0 place-items-center rounded-lg bg-success-border text-brand-leaf max-[1000px]:hidden">
        <History size={25} />
      </div>
      <div>
        <h3 className="m-0 font-heading text-lg font-bold tracking-[-0.25px] max-[800px]:text-base">
          Tus datos, también en otros dispositivos.
        </h3>
        <p className="m-0 mt-1 text-sm-plus text-muted-foreground max-[1000px]:max-w-[400px] max-[520px]:text-sm">
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
    <Card className="gap-0 py-0">
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
    </Card>
  );
}
