# 13 — Give TariffForm explicit modes and sections

**What to build:** Replace `TariffForm`'s optional-prop modes with one discriminated `mode` prop, and split the 550-line form into section components.

**Blocked by:** 09

**Status:** ready-for-agent

**Effort:** M

**Implementation:** complete

## Why

`tariff-form.tsx` behaves differently depending on which of `record`, `invoiceDraft`, `firstTariff` and `duplicatedFrom` are set. It has two save callbacks (`onSave` and `record.onSave`), and it's reused by `TariffRecordForm` and `BillForm`. Readers have to work out which combinations are valid.

## Checklist

- [x] Add `mode: { kind: "offer"; first: boolean; duplicatedFrom?: string } | { kind: "record"; … } | { kind: "invoice"; … }`, each variant with its own `onSave` signature. Handle it with exhaustive switches.
- [x] Extract `EnergySection`, `PowerSection`, `ChargesSection`, `OfferValiditySection` and `TariffPreview`.
- [x] Callers (`dashboard.tsx`, `tariff-record-form.tsx`, `bill-form.tsx`) pass one mode.
- [x] Browser suite passes, with no visual change.

## Comments

`TariffForm` now takes a single `mode: TariffFormMode` prop, and each variant has its own `onSave`:

- **`offer`** (`first`, `duplicatedFrom?`): `onSave(tariff, { since, profile, makeCurrent })`. The second argument is `saveTariff`'s options type, now exported as `SaveTariffOptions`, so the dashboard passes it straight through.
- **`record`** (`title`, `start`, `end?`, `preview?`): `onSave(tariff, dates)`. When `end` is omitted, the period is open-ended and the end date field is hidden.
- **`invoice`**: `onSave(tariff, profile)`. `BillForm` no longer has to ignore a `since` argument.

**Folded flags.** The old `record.correction` flag and `record.preview` were always set together, so they're now a single `preview?`. Its presence means a correction: the "Ajustar también los períodos contiguos" checkbox and the date preview. `invoiceDraft` and `firstTariff={false}` became `kind: "invoice"`.

**Exhaustive switches.** The title, the submit label and the save call switch over `mode.kind`, each with a `never` default. The two-way profile-section wording, invoice or shared profile, stays a ternary.

**Sections.** They live in `tariff-form-sections.tsx`:

- **The five from the ticket:** `EnergySection`, `PowerSection`, `ChargesSection`, `OfferValiditySection` and `TariffPreview`.
- **`PeriodDatesSection`:** the record-mode dates, checkbox and preview.
- **`PriceField`:** replaces the old `numeric()` closure.

`OfferValiditySection` renders inside `ChargesSection` as a child, because the markup nests the validity `<details>` inside section 03. The cost calculation moved into `TariffPreview`, which is the only place that uses it.

`tariff-form.tsx` is down from 551 to 242 lines. The sections file is 482 lines, almost all of it markup and copy.

**Validation.**

- I dumped the open dialog's HTML (with React-generated ids removed) and visible text for 14 form states, before and after the change. All 28 files are identical. The states:
  - first tariff: default, unchecked, the fixed/combined/monthly variants, and with estimates applied;
  - adding, editing and duplicating a tariff, plus a duplicate with a validation error;
  - historical, current, correction, correction with the date preview, and correction of a closed period;
  - the invoice tariff.
- Typecheck, lint, the unit tests (103) and the browser suite (35) pass.
