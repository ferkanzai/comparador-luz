import { and, asc, eq, getTableColumns, inArray, sql } from "drizzle-orm";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";
import {
  emptyWorkspace,
  workspaceSchema,
  type Bill,
  type Profile,
  type Tariff,
  type Workspace,
} from "../lib/domain";
import type { Transaction } from ".";
import {
  bill,
  billBreakdown,
  billProfile,
  billTariff,
  tariff,
  tariffPeriod,
  workspace,
} from "./schema";

type Row = Record<string, unknown>;
// Columns that never come from the domain objects.
const structural = new Set(["userId", "seq", "billId"]);

/**
 * Domain values to columns: an empty form value is NULL, and decimals use a
 * point. Only the keys the table has are kept.
 */
function toColumns(table: PgTable, value: object, keys?: string[]): Row {
  const columns = getTableColumns(table);
  const source = value as Row;
  return Object.fromEntries(
    (keys ?? Object.keys(columns))
      .filter((key) => key in source && !structural.has(key))
      .map((key) => {
        const column = columns[key];
        const raw = source[key];
        if (raw === "" && !column.notNull) return [key, null];
        if (typeof raw === "string" && column.columnType === "PgNumeric")
          return [key, raw.replace(",", ".")];
        return [key, raw];
      }),
  );
}
/** Columns to domain values: NULL is an empty form value. */
function fromColumns(table: PgTable, row: Row, keys: string[]): Row {
  const columns = getTableColumns(table);
  return Object.fromEntries(
    keys.map((key) => [
      key,
      row[key] === null && columns[key].dataType !== "boolean" ? "" : row[key],
    ]),
  );
}
const keysOf = (table: PgTable, ...omit: string[]) =>
  Object.keys(getTableColumns(table)).filter(
    (key) => !structural.has(key) && !omit.includes(key),
  );
const tariffKeys = keysOf(tariff, "id");
const profileKeys = keysOf(billProfile);
const breakdownKeys = keysOf(billBreakdown);

const readTariff = (row: Row, id: unknown) =>
  ({ id, ...fromColumns(tariff, row, tariffKeys) }) as Tariff;
const readProfile = (row: Row) =>
  fromColumns(billProfile, row, profileKeys) as Profile;

/** The whole workspace, or an empty one for an account that never saved. */
export async function readWorkspace(
  tx: Transaction,
  userId: string,
): Promise<Workspace> {
  const [row] = await tx
    .select()
    .from(workspace)
    .where(eq(workspace.userId, userId));
  if (!row) return emptyWorkspace();
  const tariffs = await tx
    .select()
    .from(tariff)
    .where(eq(tariff.userId, userId))
    .orderBy(asc(tariff.seq));
  const periods = await tx
    .select()
    .from(tariffPeriod)
    .where(eq(tariffPeriod.userId, userId))
    .orderBy(asc(tariffPeriod.seq));
  const bills = await tx.query.bill.findMany({
    where: eq(bill.userId, userId),
    orderBy: asc(bill.seq),
    with: { tariff: true, profile: true, breakdown: true },
  });
  return workspaceSchema.parse({
    profile: readProfile(row),
    tariffs: tariffs.map((t) => readTariff(t, t.id)),
    currentId: row.currentTariffId,
    currentSince: row.currentSince ?? "",
    history: periods.map((p) => ({
      id: p.id,
      start: p.start,
      end: p.end,
      tariff: readTariff(p, p.tariffId),
    })),
    bills: bills.map((b): Bill => ({
      id: b.id,
      month: b.month,
      periodStart: b.periodStart ?? "",
      periodEnd: b.periodEnd ?? "",
      provider: b.provider,
      paid: b.paid,
      credit: b.credit,
      kwh: b.kwh ?? "",
      ...(b.consumptionKind === "legacy"
        ? {}
        : {
            consumption:
              b.consumptionKind === "total"
                ? null
                : {
                    peakKwh: b.peakKwh ?? "",
                    flatKwh: b.flatKwh ?? "",
                    valleyKwh: b.valleyKwh ?? "",
                  },
          }),
      ...(b.reviewSignature === null
        ? {}
        : {
            tariffReview: {
              signature: b.reviewSignature,
              reason: b.reviewReason ?? "",
            },
          }),
      notes: b.notes,
      tariff: b.tariff ? readTariff(b.tariff, b.tariff.tariffId) : null,
      profile: b.profile ? readProfile(b.profile) : null,
      breakdown: b.breakdown
        ? (fromColumns(
            billBreakdown,
            b.breakdown,
            breakdownKeys,
          ) as Bill["breakdown"])
        : null,
    })),
  });
}

/** Mutations need the workspace row: every record belongs to it. */
export async function ensureWorkspace(tx: Transaction, userId: string) {
  await tx
    .insert(workspace)
    .values({
      userId,
      ...toColumns(workspace, emptyWorkspace().profile),
    } as never)
    .onConflictDoNothing();
}

async function upsert(
  tx: Transaction,
  table: PgTable,
  rows: Row[],
  target: PgColumn[],
) {
  if (!rows.length) return;
  const columns = getTableColumns(table);
  const set = Object.fromEntries(
    Object.keys(rows[0])
      .filter((key) => !target.includes(columns[key]))
      .map((key) => [key, sql.raw(`excluded."${columns[key].name}"`)]),
  );
  await tx
    .insert(table)
    .values(rows as never)
    .onConflictDoUpdate({ target, set });
}
const same = (a: unknown, b: unknown) =>
  a === b || JSON.stringify(a) === JSON.stringify(b);
/** Records that are new or differ in `after`, and the ids that are gone. */
function changes<T extends { id: string }>(before: T[], after: T[]) {
  const previous = new Map(before.map((record) => [record.id, record]));
  const kept = new Set(after.map((record) => record.id));
  return {
    saved: after.filter((record) => !same(previous.get(record.id), record)),
    removed: before.filter((r) => !kept.has(r.id)).map((r) => r.id),
  };
}

/**
 * Writes only what differs between `before` (as read) and `after`. The order
 * respects the foreign keys: offers exist before they become current, and stop
 * being current before they are removed.
 */
export async function writeChanges(
  tx: Transaction,
  userId: string,
  before: Workspace,
  after: Workspace,
) {
  const owned = <T extends object>(values: T) => ({ userId, ...values });
  const tariffs = changes(before.tariffs, after.tariffs);
  await upsert(
    tx,
    tariff,
    tariffs.saved.map((t) => owned(toColumns(tariff, t))),
    [tariff.userId, tariff.id],
  );
  if (
    !same(before.profile, after.profile) ||
    before.currentId !== after.currentId ||
    before.currentSince !== after.currentSince
  )
    await tx
      .update(workspace)
      .set({
        ...toColumns(workspace, after.profile),
        currentTariffId: after.currentId,
        currentSince: after.currentSince || null,
      })
      .where(eq(workspace.userId, userId));
  if (tariffs.removed.length)
    await tx
      .delete(tariff)
      .where(
        and(eq(tariff.userId, userId), inArray(tariff.id, tariffs.removed)),
      );

  const periods = changes(before.history, after.history);
  await upsert(
    tx,
    tariffPeriod,
    periods.saved.map((p) =>
      owned({
        ...toColumns(tariffPeriod, p.tariff, tariffKeys),
        id: p.id,
        start: p.start,
        end: p.end,
        tariffId: p.tariff.id,
      }),
    ),
    [tariffPeriod.userId, tariffPeriod.id],
  );
  if (periods.removed.length)
    await tx
      .delete(tariffPeriod)
      .where(
        and(
          eq(tariffPeriod.userId, userId),
          inArray(tariffPeriod.id, periods.removed),
        ),
      );

  const bills = changes(before.bills, after.bills);
  await upsert(
    tx,
    bill,
    bills.saved.map((b) =>
      owned({
        ...toColumns(bill, b, [
          "id",
          "month",
          "periodStart",
          "periodEnd",
          "provider",
          "paid",
          "credit",
          "kwh",
          "notes",
        ]),
        consumptionKind:
          b.consumption === undefined
            ? "legacy"
            : b.consumption === null
              ? "total"
              : "periods",
        ...toColumns(
          bill,
          b.consumption ?? { peakKwh: "", flatKwh: "", valleyKwh: "" },
        ),
        reviewSignature: b.tariffReview?.signature ?? null,
        reviewReason: b.tariffReview?.reason ?? null,
      }),
    ),
    [bill.userId, bill.id],
  );
  // Each optional part is written when present and removed when absent.
  const parts = [
    {
      table: billTariff,
      value: (b: Bill) =>
        b.tariff && {
          ...toColumns(billTariff, b.tariff, tariffKeys),
          tariffId: b.tariff.id,
        },
    },
    {
      table: billProfile,
      value: (b: Bill) => b.profile && toColumns(billProfile, b.profile),
    },
    {
      table: billBreakdown,
      value: (b: Bill) => b.breakdown && toColumns(billBreakdown, b.breakdown),
    },
  ];
  for (const { table, value } of parts) {
    const columns = getTableColumns(table);
    const present = bills.saved.filter((b) => value(b));
    await upsert(
      tx,
      table,
      present.map((b) => owned({ billId: b.id, ...value(b)! })),
      [columns.userId, columns.billId],
    );
    const absent = bills.saved.filter((b) => !value(b)).map((b) => b.id);
    if (absent.length)
      await tx
        .delete(table)
        .where(
          and(eq(columns.userId, userId), inArray(columns.billId, absent)),
        );
  }
  if (bills.removed.length)
    await tx
      .delete(bill)
      .where(and(eq(bill.userId, userId), inArray(bill.id, bills.removed)));
}
