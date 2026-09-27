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
    <nav
      ref={ref}
      aria-label="Secciones del comparador"
      className="flex gap-7 max-[1000px]:gap-6 max-[520px]:w-full max-[520px]:flex-wrap max-[520px]:justify-start max-[520px]:gap-x-5 max-[520px]:gap-y-0"
    >
      {tabs.map(({ id, label, Icon }) => (
        <button
          key={id}
          aria-current={tab === id ? "page" : undefined}
          className="relative flex items-center gap-2 px-px py-4 text-base/[1.6] font-medium text-muted-foreground aria-[current=page]:text-foreground aria-[current=page]:after:absolute aria-[current=page]:after:inset-x-0 aria-[current=page]:after:-bottom-px aria-[current=page]:after:h-[3px] aria-[current=page]:after:rounded-sm aria-[current=page]:after:bg-primary aria-[current=page]:after:content-[''] max-[520px]:gap-1.5 max-[520px]:px-0 max-[520px]:py-3.5 max-[520px]:text-sm-plus/[1.6] max-[520px]:[&_svg]:w-[15px]"
          onClick={() => onChange(id)}
        >
          <Icon size={17} className="shrink-0" />
          {label}
        </button>
      ))}
    </nav>
  );
}
