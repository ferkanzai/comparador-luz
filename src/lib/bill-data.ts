import { cents, type Calculation } from "./calculator";
import {
  numberOf,
  billBreakdownSchema,
  decimal,
  today,
  type Bill,
  type Profile,
  type Tariff,
} from "./domain";

export const billGroups = [
  ["energy", "Energía"],
  ["power", "Potencia"],
  ["other", "Otros cargos"],
  ["taxes", "Impuestos"],
  ["unknown", "Sin desglose"],
  ["credit", "Descuentos"],
] as const;
const longMonthFormat = new Intl.DateTimeFormat("es-ES", {
  month: "long",
  timeZone: "UTC",
});
export function billMonthLabel(month: string) {
  const name = longMonthFormat.format(new Date(`${month}-01`));
  return `${name[0].toUpperCase()}${name.slice(1)} ${month.slice(0, 4)}`;
}
export function billTotal(bill: Pick<Bill, "paid" | "credit">) {
  return cents(numberOf(bill.paid) + numberOf(bill.credit));
}

export const billLines = [
  ["energy", "Energía"],
  ["power", "Potencia"],
  ["social", "Financiación bono social"],
  ["snoee", "Coste SNOEE"],
  ["meter", "Alquiler de contador"],
  ["services", "Servicios"],
  ["electricityTax", "Impuesto eléctrico"],
  ["vat", "IVA suministro"],
  ["servicesVat", "IVA servicios"],
] as const;
// Estimates hide optional charges that are zero in every compared cost;
// recorded bills always show every line because zero is a recorded value.
export function estimateLines(costs: readonly (Calculation | null)[]) {
  return billLines.filter(
    ([key]) =>
      key === "energy" ||
      key === "power" ||
      costs.some((cost) => cost && cents(cost[key]) !== 0),
  );
}
export function billFromCalculation(
  tariff: Tariff,
  profile: Profile,
  cost: Calculation,
): Bill {
  const periodEnd = today();
  const start = new Date(`${periodEnd}T00:00:00Z`);
  start.setUTCDate(start.getUTCDate() - cost.days);
  return {
    periodStart: start.toISOString().slice(0, 10),
    periodEnd,
    id: crypto.randomUUID(),
    month: today().slice(0, 7),
    provider: tariff.provider || tariff.name,
    paid: String(cost.total),
    credit: "0",
    kwh: String(cost.kwh),
    consumption: {
      peakKwh: profile.peakKwh,
      flatKwh: profile.flatKwh,
      valleyKwh: profile.valleyKwh,
    },
    notes: "",
    tariff: structuredClone(tariff),
    profile: structuredClone(profile),
    breakdown: {
      energy: String(cost.energy),
      power: String(cost.power),
      social: String(cost.social),
      snoee: String(cost.snoee),
      meter: String(cost.meter),
      services: String(cost.services),
      electricityTax: String(cost.electricityTax),
      vat: String(cost.vat),
      servicesVat: String(cost.servicesVat),
    },
  };
}

export function billReconciliation(bill: Bill) {
  if (
    !bill.breakdown ||
    !billBreakdownSchema.safeParse(bill.breakdown).success ||
    !decimal().safeParse(bill.credit).success ||
    !/^-?\d+(?:[.,]\d+)?$/.test(bill.paid) ||
    !Number.isFinite(numberOf(bill.paid))
  )
    return null;
  const gross = Object.values(bill.breakdown).reduce(
    (sum, value) => sum + numberOf(value),
    0,
  );
  const net = cents(gross - numberOf(bill.credit));
  return {
    gross: cents(gross),
    net,
    difference: cents(net - numberOf(bill.paid)),
  };
}

export function billBuckets(bill: Bill) {
  const b = bill.breakdown;
  return b
    ? {
        energy: numberOf(b.energy),
        power: numberOf(b.power),
        other: cents(
          numberOf(b.social) +
            numberOf(b.snoee ?? "0") +
            numberOf(b.meter) +
            numberOf(b.services),
        ),
        taxes: cents(
          numberOf(b.electricityTax) +
            numberOf(b.vat) +
            numberOf(b.servicesVat),
        ),
        unknown: 0,
        credit: -numberOf(bill.credit ?? "0"),
      }
    : {
        energy: 0,
        power: 0,
        other: 0,
        taxes: 0,
        unknown: billTotal(bill),
        credit: -numberOf(bill.credit ?? "0"),
      };
}
