import { billConsumption } from "./bill-consumption";
import { emptyWorkspace, type Bill, type Profile } from "./domain";

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
