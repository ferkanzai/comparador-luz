import { decimalComma, formatPowerPrice, numberOf } from "./domain";

// Display only: keep entered precision up to six decimals, never mutate quotes.
export function formatTariffPrice(value: string): string {
  if (!value) return "—";
  const localized = decimalComma(value);
  if ((localized.split(",")[1]?.length ?? 0) <= 6) return localized;
  const amount = numberOf(value);
  if (amount > 0 && amount < 0.000001) return "<0,000001";
  return formatPowerPrice(amount);
}
