import { type Bill, numberOf } from "./domain";
import { consumptionMonths } from "./bill-consumption";
import { cents } from "./calculator";

export const invoiceYears = (bills: Bill[]) =>
  [...new Set(bills.map((bill) => bill.month.slice(0, 4)))].sort().reverse();
export type YearMetric = "paid" | "consumption";
export function yearSeries(bills: Bill[], year: string, metric: YearMetric) {
  const consumption = consumptionMonths(bills, year);
  return consumption.map((month) => {
    const entries = bills.filter((bill) => bill.month === month.month);
    const value =
      metric === "consumption"
        ? month.total
        : entries.length
          ? cents(entries.reduce((sum, bill) => sum + numberOf(bill.paid), 0))
          : null;
    return {
      label: month.label,
      value,
      count: entries.length,
      missing: metric === "consumption" ? month.missing : 0,
      complete: value !== null && (metric === "paid" || month.missing === 0),
    };
  });
}
export function compareYears(
  bills: Bill[],
  earlier: string,
  later: string,
  metric: YearMetric,
) {
  const first = yearSeries(bills, earlier, metric);
  const second = yearSeries(bills, later, metric);
  const rows = first.map((a, i) => {
    const b = second[i];
    return {
      label: a.label,
      first: a,
      second: b,
      difference:
        a.complete && b.complete
          ? Number((b.value! - a.value!).toFixed(6))
          : null,
    };
  });
  const common = rows.filter((row) => row.difference !== null);
  const firstTotal = common.reduce((sum, row) => sum + row.first.value!, 0);
  const secondTotal = common.reduce((sum, row) => sum + row.second.value!, 0);
  return {
    rows,
    commonMonths: common.length,
    firstTotal,
    secondTotal,
    difference: Number((secondTotal - firstTotal).toFixed(6)),
    percent:
      firstTotal > 0 ? ((secondTotal - firstTotal) / firstTotal) * 100 : null,
  };
}
