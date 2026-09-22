import {
  decimal,
  numberOf,
  powerDayFactor,
  type Profile,
  type Tariff,
} from "./domain";

export function invoicePriceQuantities(
  tariff: Tariff,
  profile: Profile,
): [keyof Tariff, string, number][] {
  const consumption = [profile.peakKwh, profile.flatKwh, profile.valleyKwh];
  const days = numberOf(profile.days);
  return [
    [
      "energyPeak",
      tariff.kind === "fixed" ? "Energía total" : "Energía punta",
      tariff.kind === "fixed"
        ? numberOf(profile.peakKwh) +
          numberOf(profile.flatKwh) +
          numberOf(profile.valleyKwh)
        : numberOf(profile.peakKwh),
    ],
    ...(tariff.kind === "periods"
      ? ([
          ["energyFlat", "Energía llano", numberOf(profile.flatKwh)],
          ["energyValley", "Energía valle", numberOf(profile.valleyKwh)],
        ] as [keyof Tariff, string, number][])
      : []),
    [
      "powerPeak",
      "Potencia punta",
      numberOf(profile.peakKw) * days * powerDayFactor(tariff.powerUnit),
    ],
    [
      "powerValley",
      "Potencia valle",
      numberOf(profile.valleyKw) * days * powerDayFactor(tariff.powerUnit),
    ],
    ["socialDay", "Bono social del periodo", days],
    [
      "snoeeKwh",
      "Coste SNOEE del periodo",
      consumption.every(
        (value) => value !== "" && decimal().safeParse(value).success,
      )
        ? consumption.reduce((total, value) => total + numberOf(value), 0)
        : NaN,
    ],
    ["meterDay", "Alquiler del periodo", days],
  ];
}

// Build the complete result before applying it, so one invalid amount changes no prices.
export function tariffFromInvoiceAmounts(
  tariff: Tariff,
  profile: Profile,
  amounts: Record<string, string>,
): Tariff {
  const next = { ...tariff };
  let applied = false;
  for (const [key, , quantity] of invoicePriceQuantities(tariff, profile)) {
    const amount = amounts[key];
    if (!amount) continue;
    if (!decimal().safeParse(amount).success)
      throw new Error(
        "Introduce un importe sin impuestos válido (puedes usar coma decimal).",
      );
    if (quantity <= 0 || !Number.isFinite(quantity))
      throw new Error(
        key === "snoeeKwh"
          ? "Para calcular el precio SNOEE, completa los tres consumos (usa 0 donde corresponda). El consumo total debe ser mayor que 0."
          : "Completa el consumo, la potencia y los días correspondientes antes de calcular los precios.",
      );
    Object.assign(next, {
      [key]: String(Number((numberOf(amount) / quantity).toFixed(12))),
    });
    if (key === "meterDay") next.meterEstimate = "none";
    if (key === "socialDay") next.socialEstimate = "none";
    applied = true;
  }
  if (!applied) throw new Error("Introduce al menos un importe de tu factura.");
  if (amounts.powerPeak || amounts.powerValley) next.powerKind = "periods";
  return next;
}
