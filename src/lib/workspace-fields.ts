import type { Bill, Consumption, Profile, Tariff } from "./domain";

type BillBreakdown = NonNullable<Bill["breakdown"]>;

/**
 * How each stored workspace value maps to a column. Decimals and dates are
 * nullable (an empty form value) unless `required`; the rest are NOT NULL.
 * `tests/workspace-storage.test.ts` checks this against the migrated schema,
 * and `tests/workspace-fields.test.ts` against the Zod schemas.
 */
export type StoredField =
  | { kind: "decimal"; min: number; max: number; required?: true }
  | { kind: "date"; required?: true; column?: string }
  | { kind: "enum"; values: readonly string[] }
  | { kind: "text"; maxLength?: number }
  | { kind: "boolean" };
export type FieldGroup = Readonly<Record<string, StoredField>>;

const decimal = (max = 1_000_000, min = 0) =>
  ({ kind: "decimal", min, max }) as const;
const required = <F extends StoredField>(field: F) =>
  ({ ...field, required: true }) as const;
const date = { kind: "date" } as const;
const text = (maxLength?: number) => ({ kind: "text", maxLength }) as const;
const boolean = { kind: "boolean" } as const;
const oneOf = (...values: string[]) => ({ kind: "enum", values }) as const;

export const profileFields = {
  days: decimal(366),
  peakKwh: decimal(),
  flatKwh: decimal(),
  valleyKwh: decimal(),
  peakKw: decimal(15),
  valleyKw: decimal(15),
  taxes: boolean,
  vat: decimal(100),
  electricityTax: decimal(100),
  minimumTax: boolean,
} as const satisfies Record<keyof Profile, StoredField>;

export const tariffFields = {
  name: text(100),
  provider: text(100),
  kind: oneOf("fixed", "periods"),
  energyPeak: decimal(100),
  energyFlat: decimal(100),
  energyValley: decimal(100),
  powerPeak: decimal(1000),
  powerValley: decimal(1000),
  powerKind: oneOf("periods", "same", "combined"),
  powerUnit: oneOf("day", "month", "year"),
  meterDay: decimal(100),
  meterEstimate: oneOf("none", "single-2013", "three-2013"),
  socialDay: decimal(100),
  socialEstimate: oneOf("none", "ted634-2026"),
  socialInElectricityTax: boolean,
  snoeeKwh: decimal(100),
  servicesMonth: decimal(10000),
  url: text(2000),
  checkedOn: date,
  validUntil: date,
  notes: text(2000),
} as const satisfies Record<Exclude<keyof Tariff, "id">, StoredField>;

/** The bill's own columns; its tariff, profile, breakdown and review are stored apart. */
export const billFields = {
  month: text(),
  periodStart: date,
  periodEnd: date,
  provider: text(100),
  paid: required(decimal(1_000_000, -1_000_000)),
  credit: required(decimal()),
  kwh: decimal(),
  notes: text(2000),
} as const satisfies Partial<Record<keyof Bill, StoredField>>;

/** Stored on the bill row, and NULL unless the consumption is split by period. */
export const consumptionFields = {
  peakKwh: decimal(),
  flatKwh: decimal(),
  valleyKwh: decimal(),
} as const satisfies Record<keyof Consumption, StoredField>;

export const breakdownFields = {
  energy: required(decimal()),
  power: required(decimal()),
  social: required(decimal()),
  snoee: required(decimal()),
  meter: required(decimal()),
  services: required(decimal()),
  electricityTax: required(decimal()),
  vat: required(decimal()),
  servicesVat: required(decimal()),
} as const satisfies Record<keyof BillBreakdown, StoredField>;

export const workspaceDateFields = {
  currentSince: date,
  reviewedOn: date,
} as const satisfies FieldGroup;

export const historyDateFields = {
  start: { kind: "date", required: true, column: "start_date" },
  end: { kind: "date", required: true, column: "end_date" },
} as const satisfies FieldGroup;

/** Which registry group describes each table's value columns. */
export const tableFields = {
  workspace: [workspaceDateFields],
  workspace_profile: [profileFields],
  workspace_tariff: [tariffFields],
  workspace_tariff_snapshot: [tariffFields],
  workspace_history: [historyDateFields],
  workspace_bill: [billFields, consumptionFields],
  workspace_bill_profile: [profileFields],
  workspace_bill_breakdown: [breakdownFields],
} as const satisfies Record<string, readonly FieldGroup[]>;

export const columnOf = (name: string, field: StoredField) =>
  ("column" in field && field.column) ||
  name.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);

/** Every name stored as a decimal in any group; names never change kind between groups. */
export const decimalNames: ReadonlySet<string> = new Set(
  [
    profileFields,
    tariffFields,
    billFields,
    consumptionFields,
    breakdownFields,
  ].flatMap((group) =>
    Object.entries(group)
      .filter(([, field]) => field.kind === "decimal")
      .map(([name]) => name),
  ),
);
