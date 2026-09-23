# 20 — One field registry for tariff, bill and profile storage

**What to build:** Describe each stored field once (name, column, kind: decimal, date, enum or text, and limits), and derive the storage field lists, numeric and date sets, and encode/decode behaviour from that description. Remove the dead entries.

**Blocked by:** 18

**Status:** ready-for-agent

**Effort:** M

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

- [ ] Registry module: one entry per field, used by `workspace-records.ts` for field lists, numeric/date handling and column names.
- [ ] Add a test that compares the registry against `information_schema.columns` and the CHECK constraints in the disposable test database, so drift fails a test instead of production.
- [ ] Remove `quantity`, `price` and `amount`.
- [ ] Out of scope: generating SQL from the registry. Migrations stay hand-written.
