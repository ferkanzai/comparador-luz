import {
  numberOf as n,
  profileSchema,
  tariffSchema,
  powerDayFactor,
  type Profile,
  type Tariff,
} from "./domain";
export const cents = (value: number) =>
  Math.round((value + Number.EPSILON) * 100) / 100;
export function calculate(t: Tariff, p: Profile) {
  if (!profileSchema.safeParse(p).success || !tariffSchema.safeParse(t).success)
    return null;
  const required = [
    p.days,
    p.peakKwh,
    p.flatKwh,
    p.valleyKwh,
    p.peakKw,
    p.valleyKw,
    t.energyPeak,
    t.powerPeak,
  ];
  if (!t.powerKind || t.powerKind === "periods") required.push(t.powerValley);
  if (t.kind === "periods") required.push(t.energyFlat, t.energyValley);
  if (p.taxes) required.push(p.vat, p.electricityTax);
  if (
    required.some((s) => s === "") ||
    n(p.days) <= 0 ||
    !Number.isInteger(n(p.days))
  )
    return null;
  const days = n(p.days);
  if (t.powerKind === "combined" && n(p.peakKw) !== n(p.valleyKw)) return null;
  const kwh = n(p.peakKwh) + n(p.flatKwh) + n(p.valleyKwh);
  const energy = cents(
    t.kind === "fixed"
      ? kwh * n(t.energyPeak)
      : n(p.peakKwh) * n(t.energyPeak) +
          n(p.flatKwh) * n(t.energyFlat) +
          n(p.valleyKwh) * n(t.energyValley),
  );
  const power = cents(
    (n(p.peakKw) * n(t.powerPeak) +
      (t.powerKind === "combined"
        ? 0
        : n(p.valleyKw) *
          n(t.powerKind === "same" ? t.powerPeak : t.powerValley))) *
      days *
      powerDayFactor(t.powerUnit),
  );
  const social = cents(n(t.socialDay) * days);
  const snoee = cents(n(t.snoeeKwh ?? "") * kwh);
  const meter = cents(n(t.meterDay) * days);
  const services = cents((n(t.servicesMonth) * 12 * days) / 365);
  return calculateTotals(
    { energy, power, social, snoee, meter, services, kwh, days },
    p,
    t.socialInElectricityTax !== false,
  );
}

// Shared tax treatment for entered tariffs and historical PVPC estimates.
export function calculateTotals(
  {
    energy,
    power,
    social,
    snoee = 0,
    meter,
    services,
    kwh,
    days,
  }: {
    energy: number;
    power: number;
    social: number;
    snoee?: number;
    meter: number;
    services: number;
    kwh: number;
    days: number;
  },
  p: Profile,
  socialInElectricityTax = true,
) {
  const electricityBase = cents(
    energy + power + snoee + (socialInElectricityTax ? social : 0),
  );
  const electricityTax = p.taxes
    ? cents(
        Math.max(
          (electricityBase * n(p.electricityTax)) / 100,
          p.minimumTax ? kwh * 0.001 : 0,
        ),
      )
    : 0;
  const vatBase = cents(
    energy + power + social + snoee + electricityTax + meter,
  );
  const vat = p.taxes ? cents((vatBase * n(p.vat)) / 100) : 0;
  // Separate maintenance services remain at the general IVA rate, even when supply IVA is reduced.
  const servicesVat = p.taxes ? cents(services * 0.21) : 0;
  const total = cents(vatBase + services + vat + servicesVat);
  return {
    energy,
    power,
    social,
    snoee,
    meter,
    services,
    electricityBase,
    electricityTax,
    vatBase,
    vat,
    servicesVat,
    total,
    kwh,
    days,
  };
}
export type Calculation = NonNullable<ReturnType<typeof calculate>>;
