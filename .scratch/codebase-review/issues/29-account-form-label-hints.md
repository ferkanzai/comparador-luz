# 29 — Keep hints out of form labels in the account form

**What to build:** Move the password hint in `account-form.tsx` out of the `<label>` and link it with `aria-describedby`, as the OTP hint and the shared `Field` component already do.

**Blocked by:** none

**Status:** ready-for-agent

**Effort:** S

## Why

In `account-form.tsx:291-310`, the "Al menos 12 caracteres. Puedes usar una frase." hint is a `<small>` inside the password `<label>`. Its text becomes part of the input's accessible name, so screen readers announce the whole sentence as the field name. The review script also couldn't find the field by its label "Contraseña". The same pattern appears for the name and email inputs, which wrap their text in the label (fine on its own, but inconsistent with `Field`).

## Checklist

- [ ] Password: label "Contraseña" or "Nueva contraseña", with the hint as a sibling linked through `aria-describedby`.
- [ ] Consider reusing `Field` from `ui.tsx` for the account inputs.
- [ ] Browser tests can locate the field with `getByLabel("Contraseña", { exact: true })`.
