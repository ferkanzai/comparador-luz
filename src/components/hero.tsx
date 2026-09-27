import { ArrowDownRight, Zap } from "lucide-react";

export default function Hero() {
  return (
    <section className="grid grid-cols-[minmax(0,1fr)_clamp(280px,30vw,410px)] items-center gap-[clamp(32px,4vw,56px)] pt-10 pb-9 max-[800px]:grid-cols-1 max-[800px]:gap-6 max-[800px]:py-10 max-[520px]:pt-9 max-[520px]:pb-7">
      <div className="animate-arrive">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold tracking-[1.65px]">
          <span className="inline-block size-1.5 shrink-0 rounded-full bg-ring shadow-[0_0_0_3px_var(--accent)]" />{" "}
          TU ENERGÍA. TUS NÚMEROS.
        </div>
        <h1 className="m-0 font-heading text-[clamp(32px,3.2vw,45px)] leading-[1.22] font-semibold tracking-[-1.8px] max-[800px]:text-4xl max-[520px]:text-3xl max-[520px]:tracking-[-1.45px] min-[801px]:text-[clamp(32px,3.8vw,52px)]">
          Que tu próxima factura <br className="max-[800px]:hidden" />
          traiga <span className="text-brand-leaf">una buena noticia.</span>
        </h1>
        <p className="m-0 mt-5 text-base leading-[1.8] text-muted-foreground max-[520px]:text-sm-plus max-[520px]:leading-[1.75] min-[801px]:mt-3.5 min-[801px]:text-sm-plus min-[801px]:leading-[1.65]">
          Compara con lo que consumes. Entiende lo que pagas.
          <br /> Y elige cuándo te compensa cambiar.
        </p>
      </div>
      <div className="relative min-w-0 rotate-1 rounded-sm rounded-tr-2xl border border-note-border bg-note bg-[repeating-linear-gradient(0deg,transparent,transparent_27px,color-mix(in_oklab,var(--border)_20%,transparent)_28px)] px-8 pt-7 pb-6 max-[1000px]:p-5 max-[800px]:hidden">
        <div className="absolute -top-4 right-[22px] grid size-[39px] -rotate-12 place-items-center rounded-full bg-lime">
          <Zap size={21} />
        </div>
        <span className="mb-2 flex items-center gap-2 pr-5 text-sm font-semibold tracking-[1.65px] text-muted-foreground">
          UN HÁBITO QUE SUMA
        </span>
        <p className="m-0 font-heading text-2xl leading-[1.45] tracking-[-0.5px] text-muted-foreground">
          Un café.
          <br />
          Una comparativa.
          <br />
          <strong className="font-semibold">Una decisión mejor.</strong>
        </p>
        <div className="mt-5 flex items-center justify-between gap-3 border-t border-border pt-3.5 text-sm text-muted-foreground">
          Tu revisión semanal de la luz{" "}
          <ArrowDownRight size={16} className="shrink-0" />
        </div>
      </div>
    </section>
  );
}
