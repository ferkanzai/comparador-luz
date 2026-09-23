import type * as z from "zod";
import { billMonthLabel } from "./bill-data";
import { shortDate, type Workspace } from "./domain";
import type { SyncSnapshot } from "./workspace-sync";

export function syncStatusLabel(
  status: SyncSnapshot["status"],
  stored: boolean,
): string {
  if (!stored && status !== "saved")
    return "No se pudo guardar en este dispositivo";
  switch (status) {
    case "saved":
      return "Guardado en tu cuenta";
    case "local":
      return "Guardado en este dispositivo";
    case "pending":
      return "Guardado aquí · se enviará a tu cuenta";
    case "saving":
      return "Sincronizando…";
    case "invalid":
      return "Guardado aquí · no se puede sincronizar";
    case "error":
      return "Guardado aquí · sin sincronizar";
    case "conflict":
      return "Guardado aquí · revisa la versión de tu cuenta";
    default: {
      const unhandled: never = status;
      throw new Error(`Unhandled sync status: ${unhandled}`);
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
