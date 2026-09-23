# 13 — Give TariffForm explicit modes and sections

**What to build:** Replace `TariffForm`'s optional-prop modes with one discriminated `mode` prop, and split the 550-line form into section components.

**Blocked by:** 09

**Status:** ready-for-agent

**Effort:** M

## Why

`tariff-form.tsx` behaves differently depending on which of `record`, `invoiceDraft`, `firstTariff` and `duplicatedFrom` are set. It has two save callbacks (`onSave` and `record.onSave`), and it's reused by `TariffRecordForm` and `BillForm`. Readers have to work out which combinations are valid.

## Checklist

- [ ] Add `mode: { kind: "offer"; first: boolean; duplicatedFrom?: string } | { kind: "record"; … } | { kind: "invoice"; … }`, each variant with its own `onSave` signature. Handle it with exhaustive switches.
- [ ] Extract `EnergySection`, `PowerSection`, `ChargesSection`, `OfferValiditySection` and `TariffPreview`.
- [ ] Callers (`dashboard.tsx`, `tariff-record-form.tsx`, `bill-form.tsx`) pass one mode.
- [ ] Browser suite passes, with no visual change.
