# 09 — Extract shared tariff display components

**What to build:** Move `EnergyRates`, `PowerRates` and `CostDifference` out of `comparison-table.tsx` into `src/components/tariff-rates.tsx`, and replace the inline decimal-comma formatting with one helper.

**Blocked by:** none

**Status:** ready-for-agent

**Effort:** S

## Why

- `tariff-history.tsx` and `finalist-comparison.tsx` import display components from the comparison table file. Changing the table then risks changing the history ledger.
- `.replace(".", ",")` is repeated inline (`comparison-workspace.tsx:149-160`, `domain.ts:289-290`, `comparison-table.tsx:56`), while `formatTariffPrice` (`src/lib/tariff-price-format.ts`) already exists for rounded prices.

## Checklist

- [ ] New file `tariff-rates.tsx` (kebab-case file name, PascalCase components). Update the imports.
- [ ] Add a `decimalComma(value: string)` helper, or extend `tariff-price-format.ts`, and use it everywhere the inline replace appears.
- [ ] No visual change. Browser suite passes.
