import * as z from "zod";
import { numberOf, profileSchema, today, type Profile } from "./domain";
import { calculateTotals, cents } from "./calculator";
import { pvpcPower2026, socialFinancing2026 } from "./regulated-rates";

export const pvpcSource = "https://www.esios.ree.es/es/pvpc";
export const pvpcPowerSource =
  "https://www.consumoresponde.es/art%C3%ADculos/la_facturacion_del_suministro_electrico";
export const pvpcPeriods = ["peak", "flat", "valley"] as const;
export const pvpcPeriodLabels = {
  peak: "P1 · Punta",
  flat: "P2 · Llano",
  valley: "P3 · Valle",
};
type Period = (typeof pvpcPeriods)[number];
const periodValues = z.object({
  peak: z.number().finite(),
  flat: z.number().finite(),
  valley: z.number().finite(),
});
export const pvpcMonthSchema = z.object({
  month: z.string().regex(/^2026-(0[7-9]|1[0-2])$/),
  days: z.number().int().min(28).max(31),
  hours: z.number().int().min(671).max(745),
  mean: periodValues,
  counts: periodValues,
  fetchedAt: z.iso.datetime(),
});
export type PvpcMonth = z.infer<typeof pvpcMonthSchema>;

export function previousMonth(on = today()) {
  const date = new Date(`${on.slice(0, 7)}-01T12:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() - 1);
  return date.toISOString().slice(0, 7);
}
export function pvpcDates(month: string) {
  // Reviewed regulated power/financing references cover this range only.
  if (!/^2026-(0[7-9]|1[0-2])$/.test(month))
    throw new Error(
      "Los cargos regulados de este mes aún no están revisados. No mostramos una estimación con referencias antiguas.",
    );
  const days = new Date(
    Number(month.slice(0, 4)),
    Number(month.slice(5)),
    0,
  ).getDate();
  return Array.from(
    { length: days },
    (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`,
  );
}
const sourceNumber = z
  .string()
  .regex(/^-?\d+(?:[.,]\d+)?$/)
  .transform((value) => Number(value.replace(",", ".")))
  .pipe(z.number().finite());
const daySchema = z.object({
  PVPC: z
    .array(
      z.object({
        Dia: z.string(),
        Hora: z.string(),
        PCB: sourceNumber,
        TEUPCB: sourceNumber,
      }),
    )
    .min(23)
    .max(25),
});

export function parsePvpcDay(payload: unknown, date: string) {
  const rows = daySchema.parse(payload).PVPC;
  const [year, month, day] = date.split("-");
  const localDate = `${day}/${month}/${year}`;
  const d = new Date(`${date}T12:00:00Z`);
  const lastSunday =
    d.getUTCDay() === 0 &&
    d.getUTCDate() + 7 > new Date(Number(year), Number(month), 0).getDate();
  const spring = month === "03" && lastSunday;
  const autumn = month === "10" && lastSunday;
  const expected = Array.from({ length: autumn ? 25 : 24 }, (_, h) => h)
    .filter((h) => !spring || h !== 2)
    .map(
      (h) => `${String(h).padStart(2, "0")}-${String(h + 1).padStart(2, "0")}`,
    );
  if (
    rows.length !== expected.length ||
    new Set(rows.map((r) => r.Hora)).size !== expected.length ||
    rows.some((r) => r.Dia !== localDate || !expected.includes(r.Hora))
  )
    throw new Error("ESIOS no ha devuelto todas las horas del día solicitado.");
  // TEUPCB is the published energy toll + charge in €/MWh, rounded by ESIOS.
  // It identifies the real tariff period, including national holidays and DST.
  // Never infer periods by sorting total prices or add TEU again to PCB.
  return rows.map((r) => {
    const period: Period | undefined =
      r.TEUPCB === 97.55
        ? "peak"
        : r.TEUPCB === 29.27
          ? "flat"
          : r.TEUPCB === 3.29
            ? "valley"
            : undefined;
    if (!period)
      throw new Error(
        "Los peajes publicados han cambiado y necesitan revisión.",
      );
    return { period, price: r.PCB / 1000 };
  });
}

export function summarizePvpc(
  month: string,
  days: unknown[],
  fetchedAt = new Date().toISOString(),
): PvpcMonth {
  const dates = pvpcDates(month);
  if (days.length !== dates.length)
    throw new Error("Faltan días del mes PVPC.");
  const sums = { peak: 0, flat: 0, valley: 0 };
  const counts = { peak: 0, flat: 0, valley: 0 };
  days.forEach((payload, i) =>
    parsePvpcDay(payload, dates[i]).forEach(({ period, price }) => {
      sums[period] += price;
      counts[period]++;
    }),
  );
  if (pvpcPeriods.some((p) => counts[p] === 0))
    throw new Error("Faltan períodos PVPC.");
  return pvpcMonthSchema.parse({
    month,
    days: dates.length,
    hours: counts.peak + counts.flat + counts.valley,
    mean: {
      peak: sums.peak / counts.peak,
      flat: sums.flat / counts.flat,
      valley: sums.valley / counts.valley,
    },
    counts,
    fetchedAt,
  });
}

export function calculatePvpc(
  data: PvpcMonth,
  profile: Profile,
  meterDay: string,
) {
  const parsed = profileSchema.safeParse(profile);
  if (
    !parsed.success ||
    !pvpcMonthSchema.safeParse(data).success ||
    !/^\d+(?:[.,]\d+)?$/.test(meterDay)
  )
    return null;
  const p = parsed.data;
  if (
    [p.days, p.peakKwh, p.flatKwh, p.valleyKwh, p.peakKw, p.valleyKw].some(
      (v) => v === "",
    ) ||
    (p.taxes && (!p.vat || !p.electricityTax))
  )
    return null;
  const days = numberOf(p.days);
  if (
    days <= 0 ||
    !Number.isInteger(days) ||
    numberOf(p.peakKw) > 10 ||
    numberOf(p.valleyKw) > 10 ||
    numberOf(meterDay) > 100
  )
    return null;
  const kwh = numberOf(p.peakKwh) + numberOf(p.flatKwh) + numberOf(p.valleyKwh);
  const energy = cents(
    numberOf(p.peakKwh) * data.mean.peak +
      numberOf(p.flatKwh) * data.mean.flat +
      numberOf(p.valleyKwh) * data.mean.valley,
  );
  // BOE-A-2025-26348 + BOE-A-2025-26705; fixed marketing margin on P1 only.
  const { peak, valley } = pvpcPower2026;
  const power = cents(
    ((numberOf(p.peakKw) * (peak.tolls + peak.charges + peak.margin) +
      numberOf(p.valleyKw) * (valley.tolls + valley.charges)) *
      days) /
      365,
  );
  const social = cents((socialFinancing2026.annual * days) / 365);
  // Published PVPC already includes RFE; do not add a separate SNOEE charge.
  return calculateTotals(
    {
      energy,
      power,
      social,
      meter: cents(numberOf(meterDay) * days),
      services: 0,
      days,
      kwh,
    },
    p,
  );
}
