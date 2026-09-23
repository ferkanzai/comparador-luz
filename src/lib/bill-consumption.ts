import {
  consumptionSchema,
  decimal,
  numberOf,
  shortMonthLabel,
  type Bill,
  type Consumption,
} from "./domain";

export const consumptionGroups = [
  ["peakKwh", "Punta"],
  ["flatKwh", "Llano"],
  ["valleyKwh", "Valle"],
  ["unallocated", "Sin reparto"],
] as const;
export const formatKwh = (value: number) =>
  `${value.toLocaleString("es-ES", { maximumFractionDigits: 3 })} kWh`;
export function consumptionTotal(value: Consumption) {
  if (
    !consumptionSchema.safeParse(value).success ||
    Object.values(value).some((v) => v === "")
  )
    return null;
  return Number(
    Object.values(value)
      .reduce((sum, v) => sum + numberOf(v), 0)
      .toFixed(6),
  );
}
export function billConsumption(bill: Bill): Consumption | null {
  if (bill.consumption !== undefined) return bill.consumption;
  if (!bill.profile || bill.kwh === "") return null;
  const { peakKwh, flatKwh, valleyKwh } = bill.profile;
  const value = { peakKwh, flatKwh, valleyKwh };
  const total = consumptionTotal(value);
  return total !== null && Math.abs(total - numberOf(bill.kwh)) <= 0.000001
    ? value
    : null;
}
export function updateBillConsumption(
  bill: Bill,
  consumption: Consumption | null,
): Bill {
  const total = consumption ? consumptionTotal(consumption) : null;
  return {
    ...bill,
    consumption,
    ...(consumption ? { kwh: total === null ? "" : String(total) } : {}),
  };
}
export function consumptionMonths(bills: Bill[], year: string) {
  return Array.from({ length: 12 }, (_, index) => {
    const month = `${year}-${String(index + 1).padStart(2, "0")}`;
    const entries = bills.filter((bill) => bill.month === month);
    const totals = { peakKwh: 0, flatKwh: 0, valleyKwh: 0, unallocated: 0 };
    let recorded = 0;
    for (const bill of entries) {
      if (bill.kwh === "" || !decimal().safeParse(bill.kwh).success) continue;
      recorded++;
      const periods = billConsumption(bill);
      if (
        periods &&
        consumptionTotal(periods) !== null &&
        Math.abs(consumptionTotal(periods)! - numberOf(bill.kwh)) <= 0.000001
      ) {
        totals.peakKwh += numberOf(periods.peakKwh);
        totals.flatKwh += numberOf(periods.flatKwh);
        totals.valleyKwh += numberOf(periods.valleyKwh);
      } else totals.unallocated += numberOf(bill.kwh);
    }
    return {
      month,
      label: shortMonthLabel(month),
      totals,
      recorded,
      missing: entries.length - recorded,
      total: recorded ? Object.values(totals).reduce((a, b) => a + b, 0) : null,
    };
  });
}
export type ConsumptionMonth = ReturnType<typeof consumptionMonths>[number];
