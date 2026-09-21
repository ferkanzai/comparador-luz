import { calculate, cents } from "./calculator";
import { billConsumption, consumptionTotal } from "./bill-consumption";
import {
  billBreakdownSchema,
  decimal,
  emptyWorkspace,
  numberOf,
  type Bill,
  type Profile,
  type Tariff,
  type Workspace,
} from "./domain";

export function invoiceProfile(bill: Bill): Profile | null {
  if (!bill.profile) return null;
  let days = bill.profile.days;
  if (bill.periodStart || bill.periodEnd) {
    if (
      !bill.periodStart ||
      !bill.periodEnd ||
      bill.periodEnd <= bill.periodStart
    )
      return null;
    days = String(
      (Date.parse(bill.periodEnd) - Date.parse(bill.periodStart)) / 86400000,
    );
  }
  const periods = billConsumption(bill);
  return {
    ...bill.profile,
    days,
    peakKwh: periods?.peakKwh ?? "",
    flatKwh: periods?.flatKwh ?? "",
    valleyKwh: periods?.valleyKwh ?? "",
  };
}
export function newInvoiceProfile(bill: Bill): Profile {
  return (
    invoiceProfile({
      ...bill,
      profile: bill.profile ?? { ...emptyWorkspace().profile, taxes: true },
    }) ?? { ...emptyWorkspace().profile, taxes: true }
  );
}

function expected(bill: Bill, tariff: Tariff) {
  let profile = invoiceProfile(bill);
  if (!profile || bill.kwh === "" || !decimal().safeParse(bill.kwh).success)
    return null;
  const periods = billConsumption(bill);
  if (periods) {
    const total = consumptionTotal(periods);
    if (total === null || Math.abs(total - numberOf(bill.kwh)) > 0.000001)
      return null;
  } else if (tariff.kind === "fixed") {
    // A flat rate needs only total kWh. No period distribution is inferred or saved.
    profile = { ...profile, peakKwh: bill.kwh, flatKwh: "0", valleyKwh: "0" };
  } else return null;
  const preTax =
    !!bill.breakdown && billBreakdownSchema.safeParse(bill.breakdown).success;
  if (bill.breakdown && !preTax) return null;
  if (!preTax && (!profile.taxes || !profile.vat || !profile.electricityTax))
    return null;
  const cost = calculate(
    tariff,
    preTax ? { ...profile, taxes: false } : profile,
  );
  if (!cost) return null;
  return {
    value: cents(cost.total - (preTax ? 0 : numberOf(bill.credit))),
    preTax,
  };
}
export function checkBillTariff(
  bill: Bill,
  workspace: Pick<Workspace, "tariffs" | "history">,
) {
  if (
    !bill.tariff ||
    !/^-?\d+(?:[.,]\d+)?$/.test(bill.paid) ||
    !decimal().safeParse(bill.credit).success
  )
    return null;
  const estimate = expected(bill, bill.tariff);
  if (!estimate) return null;
  const actual =
    estimate.preTax && bill.breakdown
      ? [
          bill.breakdown.energy,
          bill.breakdown.power,
          bill.breakdown.social,
          bill.breakdown.meter,
          bill.breakdown.services,
        ].reduce((sum, value) => sum + numberOf(value), 0)
      : numberOf(bill.paid);
  const difference = cents(estimate.value - actual);
  const tolerance = Math.max(2, Math.abs(actual) * 0.05);
  const mismatch = Math.abs(difference) > tolerance;
  // A single tariff is not a reliable substitute for a bill with split energy/power prices.
  const splitPrices = bill.priceLines.some(
    (line) => line.concept === "energy" || line.concept === "power",
  );
  const candidates = [
    ...workspace.tariffs.map((tariff) => ({
      tariff,
      source: "Tarifa guardada",
    })),
    ...workspace.history
      .filter(
        (h) =>
          bill.periodStart &&
          bill.periodEnd &&
          h.start <= bill.periodStart &&
          h.end >= bill.periodEnd,
      )
      .map((h) => ({
        tariff: h.tariff,
        source: `Historial: ${h.start} a ${h.end}`,
      })),
  ];
  const seen = new Set<string>();
  const suggestions =
    mismatch && !splitPrices
      ? candidates
          .flatMap((candidate) => {
            const key = JSON.stringify(candidate.tariff);
            if (seen.has(key) || key === JSON.stringify(bill.tariff)) return [];
            seen.add(key);
            const cost = expected(bill, candidate.tariff);
            const gap = cost ? Math.abs(cost.value - actual) : Infinity;
            return cost && gap <= tolerance && gap < Math.abs(difference) / 2
              ? [{ ...candidate, expected: cost.value, gap }]
              : [];
          })
          .sort((a, b) => a.gap - b.gap)
          .slice(0, 3)
      : [];
  return {
    expected: estimate.value,
    actual: cents(actual),
    difference,
    tolerance,
    preTax: estimate.preTax,
    mismatch,
    splitPrices,
    suggestions,
  };
}

// A non-security fingerprint ties a saved acknowledgement to the exact invoice inputs.
export function billCheckSignature(bill: Bill) {
  const value = JSON.stringify([
    bill.tariff,
    billConsumption(bill),
    bill.profile,
    bill.kwh,
    bill.paid,
    bill.credit,
    bill.periodStart,
    bill.periodEnd,
    bill.breakdown,
    bill.priceLines,
  ]);
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++)
    hash = Math.imul(hash ^ value.charCodeAt(i), 16777619);
  return `v1:${value.length}:${(hash >>> 0).toString(16)}`;
}
