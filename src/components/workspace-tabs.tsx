import type { Ref } from "react";
import { useSearchParams } from "next/navigation";
import { History, Receipt, SlidersHorizontal } from "lucide-react";
import {
  tabFromParam,
  tabSearch,
  type WorkspaceTab,
} from "@/lib/workspace-tab";

const tabs = [
  { id: "compare", label: "Comparador", Icon: SlidersHorizontal },
  { id: "history", label: "Mis tarifas", Icon: History },
  { id: "bills", label: "Mis facturas", Icon: Receipt },
] as const;

// The open tab lives in the URL, so it survives reloads and Back moves
// between tabs. Next keeps useSearchParams in sync with pushState.
export function useWorkspaceTab() {
  const tab = tabFromParam(useSearchParams().get("tab"));
  function setTab(next: WorkspaceTab) {
    if (next === tab) return;
    const { pathname, search, hash } = window.location;
    window.history.pushState(
      null,
      "",
      pathname + tabSearch(next, search) + hash,
    );
  }
  return [tab, setTab] as const;
}

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
