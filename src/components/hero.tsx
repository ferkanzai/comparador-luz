import { ArrowDownRight, Zap } from "lucide-react";

export default function Hero() {
  return (
    <section className="hero">
      <div>
        <div className="eyebrow">
          <span className="live-dot" /> TU ENERGÍA. TUS NÚMEROS.
        </div>
        <h1>
          Que tu próxima factura <br />
          traiga <span>una buena noticia.</span>
        </h1>
        <p>
          Compara con lo que consumes. Entiende lo que pagas.
          <br className="desktop-break" /> Y elige cuándo te compensa cambiar.
        </p>
      </div>
      <div className="hero-note">
        <div className="note-mark">
          <Zap size={21} />
        </div>
        <span className="eyebrow">UN HÁBITO QUE SUMA</span>
        <p>
          Un café.
          <br />
          Una comparativa.
          <br />
          <strong>Una decisión mejor.</strong>
        </p>
        <div className="small">
          Tu revisión semanal de la luz <ArrowDownRight size={16} />
        </div>
      </div>
    </section>
  );
}
