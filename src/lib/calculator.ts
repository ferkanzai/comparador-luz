import {
  numberOf as n,
  profileSchema,
  tariffSchema,
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
    t.powerValley,
  ];
  if (t.kind === "periods") required.push(t.energyFlat, t.energyValley);
  if (p.taxes) required.push(p.vat, p.electricityTax);
  if (
    required.some((s) => s === "") ||
    n(p.days) <= 0 ||
    !Number.isInteger(n(p.days))
  )
    return null;
  const days = n(p.days);
  const kwh = n(p.peakKwh) + n(p.flatKwh) + n(p.valleyKwh);
  const energy = cents(
    t.kind === "fixed"
      ? kwh * n(t.energyPeak)
      : n(p.peakKwh) * n(t.energyPeak) +
          n(p.flatKwh) * n(t.energyFlat) +
          n(p.valleyKwh) * n(t.energyValley),
  );
  const power = cents(
    ((n(p.peakKw) * n(t.powerPeak) + n(p.valleyKw) * n(t.powerValley)) * days) /
      (t.powerUnit === "year" ? 365 : 1),
  );
  const social = cents(n(t.socialDay) * days);
  const meter = cents(n(t.meterDay) * days);
  const services = cents((n(t.servicesMonth) * 12 * days) / 365);
  const electricityBase = cents(energy + power + social);
  const electricityTax = p.taxes
    ? cents(
        Math.max(
          (electricityBase * n(p.electricityTax)) / 100,
          p.minimumTax ? kwh * 0.001 : 0,
        ),
      )
    : 0;
  const vatBase = cents(electricityBase + electricityTax + meter);
  const vat = p.taxes ? cents((vatBase * n(p.vat)) / 100) : 0;
  // Separate maintenance services remain at the general IVA rate, even when supply IVA is reduced.
  const servicesVat = p.taxes ? cents(services * 0.21) : 0;
  const total = cents(vatBase + services + vat + servicesVat);
  return {
    energy,
    power,
    social,
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
