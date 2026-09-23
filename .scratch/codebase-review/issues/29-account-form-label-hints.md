# 29 — Keep hints out of form labels in the account form

**What to build:** Move the password hint in `account-form.tsx` out of the `<label>` and link it with `aria-describedby`, as the OTP hint and the shared `Field` component already do.

**Blocked by:** none

**Status:** ready-for-agent

**Effort:** S

**Implementation:** complete

## Why

In `account-form.tsx:291-310`, the "Al menos 12 caracteres. Puedes usar una frase." hint is a `<small>` inside the password `<label>`. Its text becomes part of the input's accessible name, so screen readers announce the whole sentence as the field name. The review script also couldn't find the field by its label "Contraseña". The same pattern appears for the name and email inputs, which wrap their text in the label (fine on its own, but inconsistent with `Field`).

## Checklist

- [x] Password: label "Contraseña" or "Nueva contraseña", with the hint as a sibling linked through `aria-describedby`.
- [x] Consider reusing `Field` from `ui.tsx` for the account inputs.
- [x] Browser tests can locate the field with `getByLabel("Contraseña", { exact: true })`.

## Comments

Implemented. The password and one-time-code fields now use a `div.auth-label` wrapper with an explicit `<label htmlFor>`, and each hint is a sibling linked through `aria-describedby`. The code field had the same problem: its "Enviado a … Caduca en 10 minutos." hint was inside the label. The name and email inputs have no hint, so they keep their wrapping labels.

I didn't reuse `Field`. Its unit-suffix wrapper and input styles differ from the account inputs, and switching would change the account page's look.

A new browser test checks that the password field is named exactly "Contraseña" and described by the hint. Phone screenshots of the password and code forms are unchanged. The browser suite passes (29 tests).
