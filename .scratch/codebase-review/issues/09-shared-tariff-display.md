# 09 — Extract shared tariff display components

**What to build:** Move `EnergyRates`, `PowerRates` and `CostDifference` out of `comparison-table.tsx` into `src/components/tariff-rates.tsx`, and replace the inline decimal-comma formatting with one helper.

**Blocked by:** none

**Status:** ready-for-agent

**Effort:** S

**Implementation:** complete

## Why

- `tariff-history.tsx` and `finalist-comparison.tsx` import display components from the comparison table file. Changing the table then risks changing the history ledger.
- `.replace(".", ",")` is repeated inline (`comparison-workspace.tsx:149-160`, `domain.ts:289-290`, `comparison-table.tsx:56`), while `formatTariffPrice` (`src/lib/tariff-price-format.ts`) already exists for rounded prices.

## Checklist

- [x] New file `tariff-rates.tsx` (kebab-case file name, PascalCase components). Update the imports.
- [x] Add a `decimalComma(value: string)` helper, or extend `tariff-price-format.ts`, and use it everywhere the inline replace appears.
- [x] No visual change. Browser suite passes.

## Comments

Implemented. `EnergyRates`, `PowerRates` and `CostDifference` now live in `src/components/tariff-rates.tsx`. `tariff-history.tsx` and `finalist-comparison.tsx` import them from there, and take only the `ComparisonRow` type from the table.

`decimalComma` lives in `domain.ts` rather than `tariff-price-format.ts`, because `domain.ts` needs it for `powerDescription` and `tariff-price-format.ts` already imports from `domain.ts`. It includes the "—" fallback that every call site repeated. It replaces all the inline replacements, including two extra ones in `profile-fields.tsx` (`TaxAssumptions`) and one in `tariff-history.tsx`.

Validation: unit tests, and the 28-test browser suite.
