import type { Tariff } from "./domain";

// Versioned references stay attached to saved tariffs and historical snapshots.
// Never replace a saved price when a reference changes.
export const meterEstimates = {
  "single-2013": { monthly: 0.81, label: "Monofásico · 0,81 €/mes" },
  "three-2013": { monthly: 1.36, label: "Trifásico · 1,36 €/mes" },
};
export const socialEstimate2026 = {
  annual: 9.011295,
  source: "https://www.boe.es/eli/es/o/2026/06/17/ted634",
};
export const meterEstimateSource =
  "https://www.i-de.es/accesos-gestiones-online/preguntas-frecuentes";

export function estimateMeter(
  tariff: Tariff,
  kind: keyof typeof meterEstimates,
): Tariff {
  return {
    ...tariff,
    meterDay: ((meterEstimates[kind].monthly * 12) / 365).toFixed(12),
    meterEstimate: kind,
  };
}
export function estimateSocial(tariff: Tariff): Tariff {
  return {
    ...tariff,
    socialDay: (socialEstimate2026.annual / 365).toFixed(12),
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
