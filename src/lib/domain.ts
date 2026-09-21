import { z } from "zod";

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
  powerUnit: z.enum(["day", "year"]),
  meterDay: decimal(100),
  socialDay: decimal(100),
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
export const billSchema = z.object({
  id: z.uuid(),
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  provider: z.string().trim().min(1).max(100),
  paid: decimal(1_000_000).refine((s) => s !== ""),
  kwh: decimal(),
  notes: z.string().max(2000),
  tariff: tariffSchema.nullable(),
});
export const workspaceSchema = z
  .object({
    profile: profileSchema,
    tariffs: z.array(tariffSchema).max(100),
    currentId: z.uuid().nullable(),
    currentSince: optionalDate,
    history: z.array(historySchema).max(500),
    bills: z.array(billSchema).max(1200),
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
  powerUnit: "day",
  meterDay: "",
  socialDay: "",
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
export function changeCurrent(w: Workspace, id: string, on: string): Workspace {
  if (!w.tariffs.some((t) => t.id === id))
    throw new Error("Selecciona una tarifa válida.");
  if (
    !date.safeParse(on).success ||
    on > today() ||
    (w.currentSince && on < w.currentSince)
  )
    throw new Error(
      "La fecha debe estar entre el inicio de tu contrato actual y hoy.",
    );
  if (w.currentId === id) return w;
  const old = w.tariffs.find((t) => t.id === w.currentId);
  return {
    ...w,
    currentId: id,
    currentSince: on,
    history: old
      ? [
          ...w.history,
          {
            id: crypto.randomUUID(),
            start: w.currentSince || on,
            end: on,
            tariff: structuredClone(old),
          },
        ]
      : w.history,
  };
}
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
