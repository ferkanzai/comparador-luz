import type { Ref } from "react";
import { History, Receipt, SlidersHorizontal } from "lucide-react";

export type WorkspaceTab = "compare" | "history" | "bills";

const tabs = [
  { id: "compare", label: "Comparador", Icon: SlidersHorizontal },
  { id: "history", label: "Mis tarifas", Icon: History },
  { id: "bills", label: "Mis facturas", Icon: Receipt },
] as const;

export default function WorkspaceTabs({
  tab,
  onChange,
  ref,
}: {
  tab: WorkspaceTab;
  onChange: (tab: WorkspaceTab) => void;
  ref?: Ref<HTMLElement>;
}) {
  return (
    <nav ref={ref} aria-label="Secciones del comparador">
      {tabs.map(({ id, label, Icon }) => (
        <button
          key={id}
          aria-current={tab === id ? "page" : undefined}
          className={tab === id ? "active" : ""}
          onClick={() => onChange(id)}
        >
          <Icon size={17} />
          {label}
        </button>
      ))}
    </nav>
  );
}
