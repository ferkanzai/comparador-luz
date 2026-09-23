import {
  type AnyPgColumn,
  bigint,
  boolean,
  date,
  foreignKey,
  integer,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

// Values are validated with the Zod schemas in src/lib/domain.ts before they are
// written, so the tables only enforce structure: types, presence and ownership.
// Decimals stay exact (NUMERIC read as strings) and dates are 'YYYY-MM-DD' strings.
const decimal = (name: string) => numeric(name, { mode: "string" });
const day = (name: string) => date(name, { mode: "string" });
const userId = () => text("user_id").notNull();
// Keeps records in the order they were created.
const seq = () =>
  bigint("seq", { mode: "number" }).generatedAlwaysAsIdentity().notNull();

const profileColumns = () => ({
  days: decimal("days"),
  peakKwh: decimal("peak_kwh"),
  flatKwh: decimal("flat_kwh"),
  valleyKwh: decimal("valley_kwh"),
  peakKw: decimal("peak_kw"),
  valleyKw: decimal("valley_kw"),
  taxes: boolean("taxes").notNull(),
  vat: decimal("vat"),
  electricityTax: decimal("electricity_tax"),
  minimumTax: boolean("minimum_tax").notNull(),
});

const tariffColumns = () => ({
  name: varchar("name", { length: 100 }).notNull(),
  provider: varchar("provider", { length: 100 }).notNull(),
  kind: text("kind").notNull(),
  energyPeak: decimal("energy_peak"),
  energyFlat: decimal("energy_flat"),
  energyValley: decimal("energy_valley"),
  powerPeak: decimal("power_peak"),
  powerValley: decimal("power_valley"),
  powerKind: text("power_kind").notNull(),
  powerUnit: text("power_unit").notNull(),
  meterDay: decimal("meter_day"),
  meterEstimate: text("meter_estimate").notNull(),
  socialDay: decimal("social_day"),
  socialEstimate: text("social_estimate").notNull(),
  socialInElectricityTax: boolean("social_in_electricity_tax").notNull(),
  snoeeKwh: decimal("snoee_kwh"),
  servicesMonth: decimal("services_month"),
  url: varchar("url", { length: 2000 }).notNull(),
  checkedOn: day("checked_on"),
  validUntil: day("valid_until"),
  notes: varchar("notes", { length: 2000 }).notNull(),
});

/** One per account: the comparison profile and which offer is the current tariff. */
export const workspace = pgTable("workspace", {
  // References Better Auth's "user" table; the constraint is added in SQL.
  userId: text("user_id").primaryKey(),
  ...profileColumns(),
  // An offer of this account; the constraint is added in SQL, because the
  // tables reference each other.
  currentTariffId: uuid("current_tariff_id"),
  currentSince: day("current_since"),
});

/** Offers, including the current tariff (docs/adr/0001). */
export const tariff = pgTable(
  "tariff",
  {
    userId: userId(),
    id: uuid("id").notNull(),
    seq: seq(),
    ...tariffColumns(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.id] }),
    foreignKey({
      columns: [t.userId],
      foreignColumns: [workspace.userId],
    }).onDelete("cascade"),
  ],
);

/** A past contract period, with a snapshot of the tariff terms it had. */
export const tariffPeriod = pgTable(
  "tariff_period",
  {
    userId: userId(),
    id: uuid("id").notNull(),
    seq: seq(),
    start: day("start_date").notNull(),
    end: day("end_date").notNull(),
    /** The id the tariff had when the snapshot was taken. */
    tariffId: uuid("tariff_id").notNull(),
    ...tariffColumns(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.id] }),
    foreignKey({
      columns: [t.userId],
      foreignColumns: [workspace.userId],
    }).onDelete("cascade"),
  ],
);

export const bill = pgTable(
  "bill",
  {
    userId: userId(),
    id: uuid("id").notNull(),
    seq: seq(),
    month: text("month").notNull(),
    periodStart: day("period_start"),
    periodEnd: day("period_end"),
    provider: varchar("provider", { length: 100 }).notNull(),
    paid: decimal("paid").notNull(),
    credit: decimal("credit").notNull(),
    kwh: decimal("kwh"),
    /** 'periods' when split by period, 'total' when only the total is known, 'legacy' when never asked. */
    consumptionKind: text("consumption_kind").notNull(),
    peakKwh: decimal("peak_kwh"),
    flatKwh: decimal("flat_kwh"),
    valleyKwh: decimal("valley_kwh"),
    reviewSignature: varchar("review_signature", { length: 80 }),
    reviewReason: varchar("review_reason", { length: 500 }),
    notes: varchar("notes", { length: 2000 }).notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.id] }),
    foreignKey({
      columns: [t.userId],
      foreignColumns: [workspace.userId],
    }).onDelete("cascade"),
  ],
);

// A bill's optional parts. Each has at most one row per bill.
const billPart = () => ({
  userId: userId(),
  billId: uuid("bill_id").notNull(),
});
const belongsToBill = (t: { userId: AnyPgColumn; billId: AnyPgColumn }) => [
  primaryKey({ columns: [t.userId, t.billId] }),
  foreignKey({
    columns: [t.userId, t.billId],
    foreignColumns: [bill.userId, bill.id],
  }).onDelete("cascade"),
];

/** The tariff terms the bill was checked against. */
export const billTariff = pgTable(
  "bill_tariff",
  { ...billPart(), tariffId: uuid("tariff_id").notNull(), ...tariffColumns() },
  (t) => belongsToBill(t),
);
/** The comparison profile captured with the bill. */
export const billProfile = pgTable(
  "bill_profile",
  { ...billPart(), ...profileColumns() },
  (t) => belongsToBill(t),
);
export const billBreakdown = pgTable(
  "bill_breakdown",
  {
    ...billPart(),
    energy: decimal("energy").notNull(),
    power: decimal("power").notNull(),
    social: decimal("social").notNull(),
    snoee: decimal("snoee").notNull(),
    meter: decimal("meter").notNull(),
    services: decimal("services").notNull(),
    electricityTax: decimal("electricity_tax").notNull(),
    vat: decimal("vat").notNull(),
    servicesVat: decimal("services_vat").notNull(),
  },
  (t) => belongsToBill(t),
);

/** A fixed one-minute window of save requests per account. */
export const saveRate = pgTable("save_rate", {
  // References Better Auth's "user" table; the constraint is added in SQL.
  userId: text("user_id").primaryKey(),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
  count: integer("count").notNull(),
});
