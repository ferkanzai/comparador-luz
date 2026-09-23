import type { Bill, Consumption, Profile, Tariff, Workspace } from "./domain";
import {
  comparePeriod,
  correctPeriod,
  recordCurrent,
  recordHistorical,
  removePeriod,
  type PeriodCorrection,
} from "./tariff-periods";
import {
  adoptSimulation,
  removeBill,
  removeTariff,
  saveBill,
  saveTariff,
  updateProfile,
  type SaveTariffOptions,
} from "./workspace-actions";

export type SaveRequest = {
  method: "PUT" | "POST" | "PATCH" | "DELETE";
  path: string;
  body?: unknown;
};
/**
 * One user action. `apply` is the pure workspace action: it updates the screen
 * and a guest's browser copy, and throws a Spanish message when it can't apply.
 * `requests` save the same action to an account (docs/adr/0003).
 */
export type WorkspaceCommand = {
  apply: (w: Workspace) => Workspace;
  requests: (before: Workspace, after: Workspace) => SaveRequest[];
  /** Profile edits arrive per keystroke; accounts send them after a pause. */
  profile?: true;
};

/** A PATCH with only the fields that changed, or nothing. */
export function profileRequest(before: Profile, after: Profile): SaveRequest[] {
  const fields = Object.fromEntries(
    Object.entries(after).filter(
      ([name, value]) => before[name as keyof Profile] !== value,
    ),
  );
  return Object.keys(fields).length
    ? [{ method: "PATCH", path: "/api/profile", body: fields }]
    : [];
}
const profileChanges = (before: Workspace, after: Workspace) =>
  profileRequest(before.profile, after.profile);
const offer = (tariff: Tariff): SaveRequest => ({
  method: "PUT",
  path: `/api/offers/${tariff.id}`,
  body: tariff,
});

export const commands = {
  updateProfile: (profile: Profile): WorkspaceCommand => ({
    apply: (w) => updateProfile(w, profile),
    requests: profileChanges,
    profile: true,
  }),
  adoptSimulation: (consumption: Consumption): WorkspaceCommand => ({
    apply: (w) => adoptSimulation(w, consumption),
    requests: profileChanges,
  }),
  saveTariff: (
    tariff: Tariff,
    options: SaveTariffOptions,
  ): WorkspaceCommand => ({
    apply: (w) => saveTariff(w, tariff, options),
    requests: (before, after) => [
      ...profileChanges(before, after),
      options.makeCurrent && !before.currentId
        ? {
            method: "POST",
            path: "/api/contract/current",
            body: { tariff, since: options.since },
          }
        : offer(tariff),
    ],
  }),
  removeTariff: (id: string): WorkspaceCommand => ({
    apply: (w) => removeTariff(w, id),
    requests: (before) => [
      {
        method: "DELETE",
        path:
          id === before.currentId
            ? `/api/contract/periods/${id}`
            : `/api/offers/${id}`,
      },
    ],
  }),
  saveBill: (bill: Bill, newTariff?: Tariff): WorkspaceCommand => ({
    apply: (w) => saveBill(w, bill, newTariff),
    requests: () => [
      {
        method: "PUT",
        path: `/api/bills/${bill.id}`,
        body: { bill, ...(newTariff ? { newOffer: newTariff } : {}) },
      },
    ],
  }),
  removeBill: (id: string): WorkspaceCommand => ({
    apply: (w) => removeBill(w, id),
    requests: () => [{ method: "DELETE", path: `/api/bills/${id}` }],
  }),
  recordCurrent: (tariff: Tariff, since: string): WorkspaceCommand => ({
    apply: (w) => recordCurrent(w, tariff, since),
    requests: () => [
      {
        method: "POST",
        path: "/api/contract/current",
        body: { tariff, since },
      },
    ],
  }),
  recordHistorical: (
    tariff: Tariff,
    start: string,
    end: string,
  ): WorkspaceCommand => ({
    apply: (w) => recordHistorical(w, tariff, start, end),
    requests: () => [
      {
        method: "POST",
        path: "/api/contract/periods",
        body: { tariff, start, end },
      },
    ],
  }),
  correctPeriod: (
    id: string,
    tariff: Tariff,
    correction: PeriodCorrection,
  ): WorkspaceCommand => ({
    apply: (w) => correctPeriod(w, id, tariff, correction),
    requests: () => [
      {
        method: "PUT",
        path: `/api/contract/periods/${id}`,
        body: { tariff, ...correction },
      },
    ],
  }),
  removePeriod: (id: string): WorkspaceCommand => ({
    apply: (w) => removePeriod(w, id),
    requests: () => [{ method: "DELETE", path: `/api/contract/periods/${id}` }],
  }),
  /** Copies a recorded period into the offers, as a new offer. */
  comparePeriod: (id: string): WorkspaceCommand => ({
    apply: (w) => comparePeriod(w, id),
    requests: (before, after) =>
      after.tariffs
        .filter((t) => !before.tariffs.some((b) => b.id === t.id))
        .map(offer),
  }),
};
