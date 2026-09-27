import { z } from "zod";

export const WorkspaceTab = z.enum(["compare", "history", "bills"]);
export type WorkspaceTab = z.infer<typeof WorkspaceTab>;

// The `?tab=` value for each tab; the comparador is the bare page.
const params: Record<WorkspaceTab, string | null> = {
  compare: null,
  history: "tarifas",
  bills: "facturas",
};

export function tabFromParam(value: string | null): WorkspaceTab {
  return WorkspaceTab.options.find((tab) => params[tab] === value) ?? "compare";
}

export function tabSearch(tab: WorkspaceTab, search: string): string {
  const query = new URLSearchParams(search);
  const value = params[tab];
  if (value) query.set("tab", value);
  else query.delete("tab");
  const text = query.toString();
  return text ? `?${text}` : "";
}
