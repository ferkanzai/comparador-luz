import { cents, type Calculation } from "./calculator";
import {
  numberOf,
  today,
  type Bill,
  type Profile,
  type Tariff,
} from "./domain";

export const billLines = [
  ["energy", "Energía"],
  ["power", "Potencia"],
  ["social", "Financiación bono social"],
  ["meter", "Alquiler de contador"],
  ["services", "Servicios"],
  ["electricityTax", "Impuesto eléctrico"],
  ["vat", "IVA suministro"],
  ["servicesVat", "IVA servicios"],
] as const;
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
    notes: "",
    tariff: structuredClone(tariff),
    profile: structuredClone(profile),
    breakdown: {
      energy: String(cost.energy),
      power: String(cost.power),
      social: String(cost.social),
      meter: String(cost.meter),
      services: String(cost.services),
      electricityTax: String(cost.electricityTax),
      vat: String(cost.vat),
      servicesVat: String(cost.servicesVat),
    },
  };
}
export function billBuckets(bill: Bill) {
  const b = bill.breakdown;
  return b
    ? {
        energy: numberOf(b.energy),
        power: numberOf(b.power),
        other: cents(
          numberOf(b.social) + numberOf(b.meter) + numberOf(b.services),
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
        unknown: cents(numberOf(bill.paid) + numberOf(bill.credit ?? "0")),
        credit: -numberOf(bill.credit ?? "0"),
      };
}
