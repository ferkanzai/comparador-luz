import type { Tariff } from "./domain";
import { meterRental, socialFinancing2026 } from "./regulated-rates";

export function estimateMeter(
  tariff: Tariff,
  kind: keyof typeof meterRental,
): Tariff {
  return {
    ...tariff,
    meterDay: ((meterRental[kind].monthly * 12) / 365).toFixed(12),
    meterEstimate: kind,
  };
}
export function estimateSocial(tariff: Tariff): Tariff {
  return {
    ...tariff,
    socialDay: (socialFinancing2026.annual / 365).toFixed(12),
    socialEstimate: "ted634-2026",
  };
}
export function estimatedCharges(tariff: Tariff): string {
  return [
    tariff.meterEstimate && tariff.meterEstimate !== "none" ? "alquiler" : "",
    tariff.socialEstimate && tariff.socialEstimate !== "none"
      ? "bono social"
      : "",
  ]
    .filter(Boolean)
    .join(" y ");
}
