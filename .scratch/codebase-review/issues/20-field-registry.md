# 20 — One field registry for tariff, bill and profile storage

**What to build:** Describe each stored field once (name, column, kind: decimal, date, enum or text, and limits), and derive the storage field lists, numeric and date sets, and encode/decode behaviour from that description. Remove the dead entries.

**Blocked by:** 18

**Status:** ready-for-agent

**Effort:** M

**Implementation:** complete

## Why

Adding one tariff field (as SNOEE did in 003) currently touches:

1. `tariffSchema` in `domain.ts`
2. `newTariff()` in `domain.ts`
3. `tariffFields` in `workspace-records.ts`
4. `numericFields` or `dateFields` in `workspace-records.ts`
5. `workspace_tariff` in SQL
6. `workspace_tariff_snapshot` in SQL, which repeats all tariff columns and CHECKs

The limits are also written twice: in Zod (`decimal(100)`) and in SQL CHECKs. Missing any one step fails only at runtime or in the database integration test.

Dead code: `numericFields` (`workspace-records.ts:61-92`) still lists `quantity`, `price` and `amount`, left over from the invoice price lines removed in 002.

## Checklist

- [x] Registry module: one entry per field, used by `workspace-records.ts` for field lists, numeric/date handling and column names.
- [x] Add a test that compares the registry against `information_schema.columns` and the CHECK constraints in the disposable test database, so drift fails a test instead of production.
- [x] Remove `quantity`, `price` and `amount`.
- [x] Out of scope: generating SQL from the registry. Migrations stay hand-written.

## Comments

**What was done**

- New `src/lib/workspace-fields.ts`. Each stored field is one `StoredField` entry: `decimal` (min, max, required), `date` (required, optional column override), `enum` (values), `text` (max length) or `boolean`. The groups are `profileFields`, `tariffFields`, `billFields`, `consumptionFields`, `breakdownFields`, `workspaceDateFields` and `historyDateFields`. Each uses `satisfies Record<keyof X, StoredField>` against the domain type, so a field added to Zod but not to the registry, or the other way round, is a compile error.
- The module also exports `tableFields` (which groups each table stores), `columnOf` (camelCase to snake_case, or the override) and `decimalNames`.
- `workspace-records.ts` no longer has its own field arrays, `numericFields`, `dateFields` or column mapping. `encode` and `decode` switch on `field.kind`, with a `never` default. Snapshots reuse the tariff group through `joinedRecord`.
- The dead `quantity`, `price` and `amount` entries are gone.

**Drift tests**

- `tests/workspace-fields.test.ts` compares the registry with the Zod shapes: decimal bounds, whether an empty value is accepted (only for fields that aren't required), enum options, text lengths and booleans. It needs no database.
- `tests/workspace-storage.test.ts` gained "the storage registry matches the migrated columns and CHECK constraints". It migrates a fresh schema and checks every workspace table against the registry: column type, nullability, CHECK bounds, enum values and VARCHAR length. A column in the database that the registry doesn't describe fails the test, unless it's a structural column (ids, foreign keys, positions, version).

**Bug found and fixed**

The Zod test found that `credit` accepted an empty string while its column is `NOT NULL`. Clearing the credit field on a bill made the whole workspace save fail. `domain.ts` now turns an empty credit into `"0"`. A storage test saves a bill with an empty credit and reads back `"0"`.

**Decisions**

- SQL stays hand-written, as the ticket says. The registry describes what the migrations must produce, and the database test enforces it.
- Adding a tariff field now takes the Zod schema, `newTariff()`, one registry entry and the migration. The compiler flags a missing registry entry, and the tests flag a mismatch with Zod or SQL.

**Validation**

`pnpm typecheck`, `pnpm lint`, 105 unit tests (including both drift tests) and 36 browser tests pass.
