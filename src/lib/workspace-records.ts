import type { PoolClient } from "pg";
import { emptyWorkspace, workspaceSchema, type Workspace } from "./domain";

// Explicit field lists are also the SQL identifier allowlist. Values are always parameters.
const profileFields = [
  "days",
  "peakKwh",
  "flatKwh",
  "valleyKwh",
  "peakKw",
  "valleyKw",
  "taxes",
  "vat",
  "electricityTax",
  "minimumTax",
] as const;
const tariffFields = [
  "name",
  "provider",
  "kind",
  "energyPeak",
  "energyFlat",
  "energyValley",
  "powerPeak",
  "powerValley",
  "powerKind",
  "powerUnit",
  "meterDay",
  "meterEstimate",
  "socialDay",
  "socialEstimate",
  "socialInElectricityTax",
  "snoeeKwh",
  "servicesMonth",
  "url",
  "checkedOn",
  "validUntil",
  "notes",
] as const;
const billFields = [
  "month",
  "periodStart",
  "periodEnd",
  "provider",
  "paid",
  "credit",
  "kwh",
  "notes",
] as const;
const breakdownFields = [
  "energy",
  "power",
  "social",
  "snoee",
  "meter",
  "services",
  "electricityTax",
  "vat",
  "servicesVat",
] as const;
const numericFields = new Set([
  "days",
  "peakKwh",
  "flatKwh",
  "valleyKwh",
  "peakKw",
  "valleyKw",
  "vat",
  "electricityTax",
  "energyPeak",
  "energyFlat",
  "energyValley",
  "powerPeak",
  "powerValley",
  "meterDay",
  "socialDay",
  "snoeeKwh",
  "servicesMonth",
  "paid",
  "credit",
  "kwh",
  "quantity",
  "price",
  "amount",
  "energy",
  "power",
  "social",
  "snoee",
  "meter",
  "services",
  "servicesVat",
]);
// Match PostgreSQL NUMERIC/UUID text output without passing decimals through JS numbers.
export function normalizeWorkspaceStorage(input: Workspace): Workspace {
  function normalize(value: unknown, key = ""): unknown {
    if (typeof value === "string") {
      if (numericFields.has(key) && value !== "") {
        const number = value.replace(",", ".").replace(/^(-?)0+(?=\d)/, "$1");
        return /^-0(?:\.0+)?$/.test(number) ? number.slice(1) : number;
      }
      return key === "id" || key === "currentId" ? value.toLowerCase() : value;
    }
    if (Array.isArray(value)) return value.map((v) => normalize(v));
    if (value && typeof value === "object")
      return Object.fromEntries(
        Object.entries(value).map(([k, v]) => [k, normalize(v, k)]),
      );
    return value;
  }
  const normalized = workspaceSchema.parse(normalize(input));
  return normalized;
}
const dateFields = new Set([
  "checkedOn",
  "validUntil",
  "periodStart",
  "periodEnd",
  "start",
  "end",
  "currentSince",
  "reviewedOn",
]);
const column = (field: string) =>
  field.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
type Row = Record<string, unknown>;
function encode(source: object, fields: readonly string[]): Row {
  const value = source as Row;
  return Object.fromEntries(
    fields.map((field) => [
      column(field),
      numericFields.has(field)
        ? value[field] === ""
          ? null
          : String(value[field]).replace(",", ".")
        : dateFields.has(field)
          ? value[field] || null
          : value[field],
    ]),
  );
}
function decode(source: Row, fields: readonly string[]): Row {
  return Object.fromEntries(
    fields.map((field) => {
      const value = source[column(field)];
      return [
        field,
        numericFields.has(field)
          ? value == null
            ? ""
            : String(value)
          : dateFields.has(field)
            ? value == null
              ? ""
              : value instanceof Date
                ? [
                    value.getFullYear().toString().padStart(4, "0"),
                    (value.getMonth() + 1).toString().padStart(2, "0"),
                    value.getDate().toString().padStart(2, "0"),
                  ].join("-")
                : String(value)
            : value,
      ];
    }),
  );
}
// Cast NUMERIC before JSON construction: JSON numbers would lose decimal precision in JS.
function joinedRecord(alias: string, fields: readonly string[]) {
  return `CASE WHEN ${alias}.user_id IS NULL THEN NULL ELSE json_build_object(${fields.map((field) => `'${column(field)}', ${alias}."${column(field)}"${numericFields.has(field) ? "::text" : ""}`).join(",")}) END`;
}
export const workspaceTables = [
  "workspace",
  "workspace_profile",
  "workspace_tariff",
  "workspace_tariff_snapshot",
  "workspace_history",
  "workspace_bill",
  "workspace_bill_profile",
  "workspace_bill_breakdown",
] as const;
type Table = (typeof workspaceTables)[number];

// Batches use JSON only as a wire encoding to typed records; no JSON is persisted.
async function upsert(
  client: PoolClient,
  table: Table,
  rows: Row[],
  keys: string[],
) {
  if (!rows.length) return;
  const columns = Object.keys(rows[0]).map((c) => `"${c}"`);
  const updates = columns.filter((c) => !keys.includes(c.slice(1, -1)));
  await client.query(
    `INSERT INTO ${table} (${columns.join(",")}) SELECT ${columns.join(",")} FROM json_populate_recordset(NULL::${table}, $1::json) ON CONFLICT (${keys.join(",")}) DO UPDATE SET ${updates.map((c) => `${c} = EXCLUDED.${c}`).join(",")} WHERE (${updates.map((c) => `${table}.${c}`).join(",")}) IS DISTINCT FROM (${updates.map((c) => `EXCLUDED.${c}`).join(",")})`,
    [JSON.stringify(rows)],
  );
}
async function prune(
  client: PoolClient,
  table: Table,
  userId: string,
  key: string,
  ids: string[],
) {
  await client.query(
    `DELETE FROM ${table} WHERE user_id = $1 AND NOT (${key}::text = ANY($2::text[]))`,
    [userId, ids],
  );
}

/** Caller must hold the workspace row lock in an owner-scoped transaction. */
export async function writeWorkspaceRecords(
  client: PoolClient,
  userId: string,
  data: Workspace,
) {
  await client.query("SET CONSTRAINTS ALL DEFERRED");
  await upsert(
    client,
    "workspace_profile",
    [{ user_id: userId, ...encode(data.profile, profileFields) }],
    ["user_id"],
  );
  await upsert(
    client,
    "workspace_tariff",
    data.tariffs.map((t, position) => ({
      user_id: userId,
      id: t.id,
      position,
      ...encode(t, tariffFields),
    })),
    ["user_id", "id"],
  );
  const snapshots = [
    ...data.history.map((h) => ({
      user_id: userId,
      snapshot_key: `history/${h.id}`,
      tariff_id: h.tariff.id,
      ...encode(h.tariff, tariffFields),
    })),
    ...data.bills
      .filter((b) => b.tariff)
      .map((b) => ({
        user_id: userId,
        snapshot_key: `bill/${b.id}`,
        tariff_id: b.tariff!.id,
        ...encode(b.tariff!, tariffFields),
      })),
  ];
  await upsert(client, "workspace_tariff_snapshot", snapshots, [
    "user_id",
    "snapshot_key",
  ]);
  await upsert(
    client,
    "workspace_history",
    data.history.map((h, position) => ({
      user_id: userId,
      id: h.id,
      position,
      start_date: h.start,
      end_date: h.end,
      snapshot_key: `history/${h.id}`,
    })),
    ["user_id", "id"],
  );
  await upsert(
    client,
    "workspace_bill",
    data.bills.map((b, position) => ({
      user_id: userId,
      id: b.id,
      position,
      ...encode(b, billFields),
      snapshot_key: b.tariff ? `bill/${b.id}` : null,
      consumption_kind:
        b.consumption === undefined
          ? "legacy"
          : b.consumption === null
            ? "total"
            : "periods",
      ...Object.fromEntries(
        ["peakKwh", "flatKwh", "valleyKwh"].map((f) => [
          column(f),
          b.consumption ? encode(b.consumption, [f])[column(f)] : null,
        ]),
      ),
      review_signature: b.tariffReview?.signature ?? null,
      review_reason: b.tariffReview?.reason ?? null,
    })),
    ["user_id", "id"],
  );
  await upsert(
    client,
    "workspace_bill_profile",
    data.bills
      .filter((b) => b.profile)
      .map((b) => ({
        user_id: userId,
        bill_id: b.id,
        ...encode(b.profile!, profileFields),
      })),
    ["user_id", "bill_id"],
  );
  await upsert(
    client,
    "workspace_bill_breakdown",
    data.bills
      .filter((b) => b.breakdown)
      .map((b) => ({
        user_id: userId,
        bill_id: b.id,
        ...encode(b.breakdown!, breakdownFields),
      })),
    ["user_id", "bill_id"],
  );
  await prune(
    client,
    "workspace_bill_profile",
    userId,
    "bill_id",
    data.bills.filter((b) => b.profile).map((b) => b.id),
  );
  await prune(
    client,
    "workspace_bill_breakdown",
    userId,
    "bill_id",
    data.bills.filter((b) => b.breakdown).map((b) => b.id),
  );
  await prune(
    client,
    "workspace_history",
    userId,
    "id",
    data.history.map((h) => h.id),
  );
  await prune(
    client,
    "workspace_bill",
    userId,
    "id",
    data.bills.map((b) => b.id),
  );
  await prune(
    client,
    "workspace_tariff",
    userId,
    "id",
    data.tariffs.map((t) => t.id),
  );
  await prune(
    client,
    "workspace_tariff_snapshot",
    userId,
    "snapshot_key",
    snapshots.map((s) => s.snapshot_key),
  );
  await client.query(
    "UPDATE workspace SET current_id = $2, current_since = $3, reviewed_on = $4 WHERE user_id = $1",
    [
      userId,
      data.currentId,
      data.currentSince || null,
      data.reviewedOn || null,
    ],
  );
}

/** Reads all relations under one repeatable-read snapshot. */
export async function readWorkspaceRecords(
  client: PoolClient,
  userId: string,
): Promise<{ data: Workspace; version: number }> {
  const {
    rows: [workspace],
  } = await client.query("SELECT * FROM workspace WHERE user_id = $1", [
    userId,
  ]);
  if (!workspace) return { data: emptyWorkspace(), version: 0 };
  const {
    rows: [profile],
  } = await client.query("SELECT * FROM workspace_profile WHERE user_id = $1", [
    userId,
  ]);
  const { rows: tariffs } = await client.query(
    "SELECT * FROM workspace_tariff WHERE user_id = $1 ORDER BY position",
    [userId],
  );
  const { rows: history } = await client.query(
    `SELECT h.*, ${joinedRecord("t", ["tariffId", ...tariffFields])} AS tariff FROM workspace_history h JOIN workspace_tariff_snapshot t ON t.user_id = h.user_id AND t.snapshot_key = h.snapshot_key WHERE h.user_id = $1 ORDER BY h.position`,
    [userId],
  );
  const { rows: bills } = await client.query(
    `SELECT b.*, ${joinedRecord("t", ["tariffId", ...tariffFields])} AS tariff, ${joinedRecord("p", profileFields)} AS profile, ${joinedRecord("d", breakdownFields)} AS breakdown FROM workspace_bill b LEFT JOIN workspace_tariff_snapshot t ON t.user_id = b.user_id AND t.snapshot_key = b.snapshot_key LEFT JOIN workspace_bill_profile p ON p.user_id = b.user_id AND p.bill_id = b.id LEFT JOIN workspace_bill_breakdown d ON d.user_id = b.user_id AND d.bill_id = b.id WHERE b.user_id = $1 ORDER BY b.position`,
    [userId],
  );
  const data = workspaceSchema.parse({
    profile: decode(profile, profileFields),
    tariffs: tariffs.map((t) => ({ id: t.id, ...decode(t, tariffFields) })),
    currentId: workspace.current_id,
    ...decode(workspace, ["currentSince", "reviewedOn"]),
    history: history.map((h) => ({
      id: h.id,
      ...decode({ start: h.start_date, end: h.end_date }, ["start", "end"]),
      tariff: { id: h.tariff.tariff_id, ...decode(h.tariff, tariffFields) },
    })),
    bills: bills.map((b) => ({
      id: b.id,
      ...decode(b, billFields),
      tariff: b.tariff
        ? { id: b.tariff.tariff_id, ...decode(b.tariff, tariffFields) }
        : null,
      profile: b.profile ? decode(b.profile, profileFields) : null,
      breakdown: b.breakdown ? decode(b.breakdown, breakdownFields) : null,
      ...(b.consumption_kind === "legacy"
        ? {}
        : {
            consumption:
              b.consumption_kind === "total"
                ? null
                : decode(b, ["peakKwh", "flatKwh", "valleyKwh"]),
          }),
      ...(b.review_signature == null
        ? {}
        : {
            tariffReview: {
              signature: b.review_signature,
              reason: b.review_reason,
            },
          }),
    })),
  });
  return { data, version: workspace.version };
}
