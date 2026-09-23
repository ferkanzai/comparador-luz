# 01 — Reuse number and date formatters

**What to build:** Create each `Intl.NumberFormat` and `Intl.DateTimeFormat` once at module level instead of on every call.

**Blocked by:** none

**Status:** ready-for-agent

**Effort:** S

## Why

`money()`, `today()` and `shortDate()` in `src/lib/domain.ts` (lines 237–256) build a new formatter on each call. Measured with Node: `money()` takes about 14 µs per call, against 0.2 µs with a shared formatter (roughly 75× slower). Every render calls them many times:

- `today()` runs once per tariff row (`comparison-workspace.tsx:113`, `comparison-table.tsx:216`) and three times in `bills.tsx`.
- `money()` runs for every cell of the comparison, finalist and bills tables.
- `bills.tsx:66`, `bill-data.ts:21`, `bill-consumption.ts:72` and `pvpc-comparison.tsx:87` build month formatters inline.

## Checklist

- [ ] Hoist formatters to module constants, following the existing `powerPriceFormat` in `domain.ts:281`.
- [ ] `today()` keeps the `Europe/Madrid` time zone and still returns the current date on every call. Only the formatter is cached, not the result.
- [ ] Replace the inline `toLocaleString("es-ES", …)` calls that repeat the same options with shared helpers where it makes sense.
- [ ] Existing tests pass. Add a test that `money`, `shortDate` and `today` output is unchanged for a few sample values.
