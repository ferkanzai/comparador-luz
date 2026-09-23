import type * as z from "zod";
import { billMonthLabel } from "./bill-data";
import { shortDate, type Workspace } from "./domain";

/** How saving stands, as shown next to the workspace tabs. */
export type SaveStatus =
  | "local"
  | "saved"
  | "saving"
  | "invalid"
  | "error"
  | "outdated";

export function saveStatusLabel(status: SaveStatus): string {
  switch (status) {
    case "local":
      return "Guardado en este dispositivo";
    case "saved":
      return "Guardado en tu cuenta";
    case "saving":
      return "Guardando…";
    case "invalid":
      return "Completa el perfil para guardarlo";
    case "error":
      return "No se ha guardado el último cambio";
    case "outdated":
      return "Recarga la página para seguir guardando";
    default: {
      const unhandled: never = status;
      throw new Error(`Unhandled save status: ${unhandled}`);
    }
  }
}

const listNouns = {
  tariffs: "tarifas",
  history: "períodos en Mis tarifas",
  bills: "facturas",
} as const;

/** Names the record behind the first schema issue; Zod's own messages are English. */
export function describeWorkspaceIssue(
  data: Workspace,
  issue: z.core.$ZodIssue | undefined,
): string {
  if (!issue) return "";
  const [list, index] = issue.path;
  if (list === "profile") return "Revisa el perfil de consumo.";
  if (list === "tariffs" || list === "history" || list === "bills") {
    if (typeof index !== "number")
      return issue.code === "too_big"
        ? `Hay demasiadas ${listNouns[list]} (máximo ${String(issue.maximum)}). Elimina alguna para volver a sincronizar.`
        : "Revisa los datos.";
    if (list === "tariffs") {
      const name = data.tariffs[index]?.name.trim();
      return `Revisa la tarifa ${name ? `«${name}»` : "sin nombre"}.`;
    }
    if (list === "history") {
      const period = data.history[index];
      return `Revisa el período ${period?.start ? `que empieza el ${shortDate(period.start)}` : "de Mis tarifas"}.`;
    }
    const bill = data.bills[index];
    return `Revisa la factura ${bill?.month ? `de ${billMonthLabel(bill.month)}` : "sin mes"}.`;
  }
  // Workspace-level rules carry Spanish messages of their own.
  return issue.code === "custom" ? issue.message : "Revisa los datos.";
}
