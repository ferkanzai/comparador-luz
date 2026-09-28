import { cents, type Calculation } from "./calculator";
import { estimatedCharges } from "./charge-estimates";
import type { Tariff } from "./domain";

type Row = { tariff: Tariff; cost: Calculation | null };
export type RankedTariff = { tariff: Tariff; cost: Calculation };

/** Extends a period amount to 365 days at the same daily rate; not a forecast. */
export const annualize = (amount: number, days: number) =>
  (amount * 365) / days;

export type SavingsSummary = {
  /**
   * `switch`: another tariff is cheaper than the current one.
   * `current-cheapest`: no tariff beats the current one.
   * `no-current`: no current tariff to measure savings from.
   */
  kind: "switch" | "current-cheapest" | "no-current";
  /** The tariff every difference is measured from: the current one, or the cheapest without one. */
  reference: RankedTariff;
  best: RankedTariff;
  /** The cheapest tariff other than the reference. */
  runnerUp: RankedTariff;
  /** Period difference between the reference and the tariff it is compared with; never negative. */
  difference: number;
  /** `difference` as a share of the reference's period cost. */
  share: number;
  days: number;
  /** Every priced tariff, cheapest first, with its annualized difference from the reference. */
  ranking: (RankedTariff & { yearly: number })[];
  /** Whether the tariffs the answer rests on use estimated charges. */
  estimated: boolean;
};

/**
 * The comparison's answer: which tariff is cheapest and by how much, per period
 * and per year. Expects rows ordered by estimated period cost, as the ranking
 * shows them; returns null while fewer than two tariffs can be priced.
 */
export function summarizeSavings(
  rows: Row[],
  currentId: string | null,
): SavingsSummary | null {
  const ranked = rows.filter((row): row is RankedTariff => row.cost !== null);
  if (ranked.length < 2) return null;
  const best = ranked[0];
  const current = ranked.find((row) => row.tariff.id === currentId);
  const reference = current ?? best;
  const runnerUp = ranked.find((row) => row !== reference)!;
  const saving = current ? cents(current.cost.total - best.cost.total) : 0;
  const kind = !current
    ? "no-current"
    : saving > 0
      ? "switch"
      : "current-cheapest";
  const difference =
    kind === "switch"
      ? saving
      : cents(runnerUp.cost.total - reference.cost.total);
  const days = reference.cost.days;
  const compared = kind === "switch" ? best : runnerUp;
  return {
    kind,
    reference,
    best,
    runnerUp,
    difference,
    share: reference.cost.total > 0 ? difference / reference.cost.total : 0,
    days,
    ranking: ranked.map((row) => ({
      ...row,
      yearly: annualize(row.cost.total - reference.cost.total, days),
    })),
    estimated: [reference, compared].some(
      (row) => estimatedCharges(row.tariff) !== "",
    ),
  };
}
