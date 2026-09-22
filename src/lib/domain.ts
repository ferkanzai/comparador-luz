import * as z from "zod";

// Decimal strings preserve unfinished forms and Spanish decimal commas. No silent NaN -> 0.
export const decimal = (max = 1_000_000) =>
  z
    .string()
    .max(24)
    .refine(
      (s) =>
        s === "" ||
        (/^\d+(?:[.,]\d+)?$/.test(s) && Number(s.replace(",", ".")) <= max),
      "Introduce un número positivo válido (puedes usar coma decimal).",
    );
export const numberOf = (s: string) =>
  s === "" ? 0 : Number(s.replace(",", "."));
const date = z.iso.date();
const optionalDate = z.union([date, z.literal("")]);
export const profileSchema = z.object({
  days: decimal(366),
  peakKwh: decimal(),
  flatKwh: decimal(),
  valleyKwh: decimal(),
  peakKw: decimal(15),
  valleyKw: decimal(15),
  taxes: z.boolean(),
  vat: decimal(100),
  electricityTax: decimal(100),
  minimumTax: z.boolean(),
});
export const tariffSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(1).max(100),
  provider: z.string().trim().max(100),
  kind: z.enum(["fixed", "periods"]),
  energyPeak: decimal(100),
  energyFlat: decimal(100),
  energyValley: decimal(100),
  powerPeak: decimal(1000),
  powerValley: decimal(1000),
  powerKind: z.enum(["periods", "same", "combined"]).default("periods"),
  powerUnit: z.enum(["day", "month", "year"]),
  meterDay: decimal(100),
  meterEstimate: z.enum(["none", "single-2013", "three-2013"]).default("none"),
  socialDay: decimal(100),
  socialEstimate: z.enum(["none", "ted634-2026"]).default("none"),
  socialInElectricityTax: z.boolean().default(true),
  snoeeKwh: decimal(100).default(""),
  servicesMonth: decimal(10000),
  url: z
    .union([z.url({ protocol: /^https?$/ }), z.literal("")])
    .refine((s) => s.length <= 2000),
  checkedOn: optionalDate,
  validUntil: optionalDate,
  notes: z.string().max(2000),
});
export const historySchema = z
  .object({ id: z.uuid(), start: date, end: date, tariff: tariffSchema })
  .refine(
    (v) => v.end >= v.start,
    "La fecha final debe ser posterior al inicio.",
  );
const billedAmount = decimal().refine(
  (s) => s !== "",
  "Introduce un importe o 0.",
);
export const billBreakdownSchema = z.object({
  energy: billedAmount,
  power: billedAmount,
  social: billedAmount,
  snoee: billedAmount.default("0"),
  meter: billedAmount,
  services: billedAmount,
  electricityTax: billedAmount,
  vat: billedAmount,
  servicesVat: billedAmount,
});
export const consumptionSchema = z.object({
  peakKwh: decimal(),
  flatKwh: decimal(),
  valleyKwh: decimal(),
});
export type Consumption = z.infer<typeof consumptionSchema>;
function hasLegacyPriceLines(value: unknown): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    "priceLines" in value &&
    Array.isArray(value.priceLines) &&
    value.priceLines.length > 0
  );
}
export const billSchema = z
  .object({
    id: z.uuid(),
    month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
    periodStart: optionalDate.default(""),
    periodEnd: optionalDate.default(""),
    provider: z.string().trim().min(1).max(100),
    paid: z
      .string()
      .max(24)
      .refine(
        (s) =>
          /^-?\d+(?:[.,]\d+)?$/.test(s) && Math.abs(numberOf(s)) <= 1_000_000,
        "Introduce un total válido.",
      ),
    credit: decimal(1_000_000).default("0"),
    kwh: decimal(),
    // Undefined identifies older bills whose matching profile may supply periods.
    // Explicit null means the user chose to keep only the total.
    consumption: consumptionSchema.nullable().optional(),
    tariffReview: z
      .object({
        signature: z.string().max(80),
        reason: z.string().trim().min(1).max(500),
      })
      .optional(),
    notes: z.string().max(2000),
    tariff: tariffSchema.nullable(),
    profile: profileSchema.nullable().default(null),
    breakdown: billBreakdownSchema.nullable().default(null),
  })
  .refine(
    (b) =>
      (!b.periodStart && !b.periodEnd) ||
      (!!b.periodStart && !!b.periodEnd && b.periodEnd > b.periodStart),
    "Indica las dos fechas del período; la fecha final debe ser posterior a la inicial.",
  )
  .refine(
    (b) =>
      !b.breakdown ||
      Math.abs(
        Object.values(b.breakdown).reduce((sum, v) => sum + numberOf(v), 0) -
          numberOf(b.credit) -
          numberOf(b.paid),
      ) < 0.005,
    "La suma de los conceptos menos el crédito debe coincidir con el total pagado.",
  )
  .refine(
    (b) => b.breakdown || numberOf(b.paid) + numberOf(b.credit) >= 0,
    "Un total negativo necesita un crédito que explique el saldo a tu favor.",
  )
  .superRefine((b, ctx) => {
    if (
      b.consumption &&
      (Object.values(b.consumption).some((v) => v === "") ||
        b.kwh === "" ||
        Math.abs(
          Object.values(b.consumption).reduce(
            (sum, v) => sum + numberOf(v),
            0,
          ) - numberOf(b.kwh),
        ) > 0.000001)
    )
      ctx.addIssue({
        code: "custom",
        message:
          "Completa los tres consumos (usa 0 donde corresponda). Su suma debe coincidir con los kWh totales.",
      });
  });
export const workspaceSchema = z
  .object({
    profile: profileSchema,
    tariffs: z.array(tariffSchema).max(100),
    currentId: z.uuid().nullable(),
    currentSince: optionalDate,
    history: z.array(historySchema).max(500),
    // Retired split-price invoices are intentionally discarded, including stale browser drafts.
    bills: z.preprocess(
      (value) =>
        Array.isArray(value)
          ? value.filter((bill) => !hasLegacyPriceLines(bill))
          : value,
      z.array(billSchema).max(1200),
    ),
    reviewedOn: optionalDate,
  })
  .superRefine((w, ctx) => {
    if (w.currentId && !w.tariffs.some((t) => t.id === w.currentId))
      ctx.addIssue({ code: "custom", message: "La tarifa actual no existe." });
    for (const list of [w.tariffs, w.history, w.bills]) {
      if (new Set(list.map((x) => x.id)).size !== list.length)
        ctx.addIssue({
          code: "custom",
          message: "Hay identificadores duplicados.",
        });
    }
  });
export type Profile = z.infer<typeof profileSchema>;
export type Tariff = z.infer<typeof tariffSchema>;
export type Bill = z.infer<typeof billSchema>;
export type Workspace = z.infer<typeof workspaceSchema>;
export const emptyWorkspace = (): Workspace => ({
  profile: {
    days: "",
    peakKwh: "",
    flatKwh: "",
    valleyKwh: "",
    peakKw: "",
    valleyKw: "",
    taxes: false,
    vat: "",
    electricityTax: "",
    minimumTax: true,
  },
  tariffs: [],
  currentId: null,
  currentSince: "",
  history: [],
  bills: [],
  reviewedOn: "",
});
export const newTariff = (): Tariff => ({
  id: crypto.randomUUID(),
  name: "",
  provider: "",
  kind: "periods",
  energyPeak: "",
  energyFlat: "",
  energyValley: "",
  powerPeak: "",
  powerValley: "",
  powerKind: "periods",
  powerUnit: "day",
  meterDay: "",
  meterEstimate: "none",
  socialDay: "",
  socialEstimate: "none",
  socialInElectricityTax: true,
  snoeeKwh: "",
  servicesMonth: "",
  url: "",
  checkedOn: "",
  validUntil: "",
  notes: "",
});
export const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
export const money = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(
    n,
  );
export const shortDate = (s: string) =>
  s
    ? new Intl.DateTimeFormat("es-ES", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(s))
    : "Sin fecha";

export const powerUnitLabels = {
  day: "€/kW/día",
  month: "€/kW/mes",
  year: "€/kW/año",
};
// Monthly power uses a 30-day billing month, so 30 days costs exactly the quoted rate.
export const powerDayFactor = (unit: Tariff["powerUnit"]) =>
  unit === "month" ? 1 / 30 : unit === "year" ? 1 / 365 : 1;

// Reference: 1 kW contracted in each period, without weighting by hours.
export function comparablePowerPrice(t: Tariff, unit: Tariff["powerUnit"]) {
  if (t.powerPeak === "" || (t.powerKind === "periods" && t.powerValley === ""))
    return null;
  const peak = numberOf(t.powerPeak);
  const total =
    t.powerKind === "periods"
      ? peak + numberOf(t.powerValley)
      : t.powerKind === "same"
        ? peak * 2
        : peak;
  return (total * powerDayFactor(t.powerUnit)) / powerDayFactor(unit);
}

const powerPriceFormat = new Intl.NumberFormat("es-ES", {
  maximumFractionDigits: 6,
});
export const formatPowerPrice = (price: number | null) =>
  price === null ? "—" : powerPriceFormat.format(price);

export function powerDescription(t: Tariff) {
  const unit = powerUnitLabels[t.powerUnit];
  const peak = t.powerPeak.replace(".", ",") || "—";
  const valley = t.powerValley.replace(".", ",") || "—";
  return t.powerKind === "combined"
    ? `${peak} ${unit} · P1 + P2 combinados`
    : t.powerKind === "same"
      ? `${peak} ${unit} en cada período`
      : `P1 ${peak} · P2 ${valley} ${unit}`;
}
