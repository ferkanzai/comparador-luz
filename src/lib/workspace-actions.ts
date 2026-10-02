import {
  workspaceLimits,
  type Bill,
  type Consumption,
  type Profile,
  type Tariff,
  type Workspace,
} from "./domain";
import { recordCurrent, removePeriod, validateChanges } from "./tariff-periods";

export function canAddTariff(w: Workspace) {
  return w.tariffs.length < workspaceLimits.tariffs;
}

export type SaveTariffOptions = {
  since: string;
  profile: Profile;
  makeCurrent: boolean;
};
export function saveTariff(
  w: Workspace,
  tariff: Tariff,
  options: SaveTariffOptions,
): Workspace {
  if (w.currentId && tariff.id === w.currentId)
    throw new Error("El contrato actual se corrige desde su registro.");
  const next = { ...w, profile: options.profile };
  if (options.makeCurrent && !w.currentId)
    return recordCurrent(next, tariff, options.since);
  return validateChanges(
    {
      ...next,
      tariffs: w.tariffs.some((t) => t.id === tariff.id)
        ? w.tariffs.map((t) => (t.id === tariff.id ? tariff : t))
        : [...w.tariffs, tariff],
    },
    [],
  );
}

export function removeTariff(w: Workspace, id: string): Workspace {
  if (id === w.currentId) return removePeriod(w, id);
  return { ...w, tariffs: w.tariffs.filter((t) => t.id !== id) };
}

// Returns an unsaved draft: the copy only enters the workspace through saveTariff.
export function duplicateTariff(tariff: Tariff): Tariff {
  return {
    ...structuredClone(tariff),
    id: crypto.randomUUID(),
    name: `${tariff.name.slice(0, 92)} (copia)`,
  };
}

export function saveBill(
  w: Workspace,
  bill: Bill,
  newTariff?: Tariff,
): Workspace {
  return validateChanges(
    {
      ...w,
      tariffs:
        newTariff && !w.tariffs.some((t) => t.id === newTariff.id)
          ? [...w.tariffs, newTariff]
          : w.tariffs,
      bills: w.bills.some((b) => b.id === bill.id)
        ? w.bills.map((b) => (b.id === bill.id ? bill : b))
        : [...w.bills, bill],
    },
    [],
  );
}

export function removeBill(w: Workspace, id: string): Workspace {
  return { ...w, bills: w.bills.filter((b) => b.id !== id) };
}

export function updateProfile(w: Workspace, profile: Profile): Workspace {
  return { ...w, profile };
}

export function adoptSimulation(
  w: Workspace,
  consumption: Consumption,
): Workspace {
  return { ...w, profile: { ...w.profile, ...consumption } };
}

/** Where an imported invoice's tariff goes, preselected from the current tariff. */
export type TariffRole =
  "current" | "matches-current" | "price-change" | "offer";
/** A current tariff or a price change starts on a date the user gives. */
export const roleStartsContract = (role: TariffRole) =>
  role === "current" || role === "price-change";

export type InvoiceImportChoices = {
  bill: Bill | null;
  profile: Profile | null;
  tariff: Tariff | null;
  role: TariffRole;
  /** When the tariff's terms began, for a current tariff or a price change. */
  since: string;
};
/** Saves what the household kept from an imported invoice; null skips that part. */
export function importInvoice(
  w: Workspace,
  { bill, profile, tariff, role, since }: InvoiceImportChoices,
): Workspace {
  let next = profile ? updateProfile(w, profile) : w;
  if (tariff && roleStartsContract(role)) {
    if (!since) throw new Error("Indica desde cuándo tienes estos precios.");
    next = recordCurrent(next, tariff, since);
  } else if (tariff && role === "offer")
    next = saveTariff(next, tariff, {
      makeCurrent: false,
      profile: next.profile,
      since: "",
    });
  // The bill carries its own tariff snapshot, saved or not.
  return bill ? saveBill(next, bill) : next;
}
