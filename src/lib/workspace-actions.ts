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

export function saveTariff(
  w: Workspace,
  tariff: Tariff,
  options: { since: string; profile: Profile; makeCurrent: boolean },
): Workspace {
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
