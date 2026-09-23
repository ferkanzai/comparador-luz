import type { ReactNode } from "react";
import { Brand } from "./ui";

export default function SiteHeader({ actions }: { actions: ReactNode }) {
  return (
    <header className="site-header">
      <div className="header-inner">
        <Brand />
        <span className="header-tag">TU ELECTRICIDAD, BAJO CONTROL</span>
        <div className="header-actions">{actions}</div>
      </div>
    </header>
  );
}
