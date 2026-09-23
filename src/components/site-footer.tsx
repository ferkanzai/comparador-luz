import { Zap } from "lucide-react";

export default function SiteFooter({ onMethod }: { onMethod: () => void }) {
  return (
    <footer className="site-footer">
      <span>
        <Zap size={13} /> Luz en claro{" "}
        <span className="footer-separator">/</span> Entender también es
        ahorrar.
      </span>
      <div>
        <button className="link-button" onClick={onMethod}>
          Método y fuentes
        </button>
        <span>Hecho para hogares en España</span>
      </div>
    </footer>
  );
}
