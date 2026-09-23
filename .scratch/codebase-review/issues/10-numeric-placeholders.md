# 10 — Numeric placeholders that don't look like values

**What to build:** Change the default `0,00` placeholder on numeric fields so an empty field can't be mistaken for one containing zero.

**Blocked by:** none

**Status:** ready-for-agent

**Effort:** S

**Implementation:** complete

## Why

`Field` in `ui.tsx:68` defaults the placeholder to `"0,00"` for every decimal field. In the tariff form (seen on desktop and phone), required price inputs look pre-filled with zero. The instruction right above says "Usa 0 cuando un término no tenga coste". Users can reasonably think those fields already say zero, while the app treats them as unknown. `CONTEXT.md` says an unknown quantity is not zero, so the UI shouldn't blur that line.

## Checklist

- [x] Use an example value in a lighter style (for example "p. ej. 0,1234"), or no placeholder, together with the unit suffix that's already shown.
- [x] Keep `aria-describedby` for the unit, and keep the error messages.
- [x] Check the tariff form, bill form, profile fields and simulator on desktop and phone.

## Comments

Implemented by removing the default placeholder from `Field`. No single example value suits every numeric field ("0,1234" makes no sense for kWh, days or percentages), and an empty field with its unit suffix already reads as "not filled in". Callers can still pass their own `placeholder`. The unit's `aria-describedby` and the error messages are unchanged.

Checked in screenshots on desktop and phone: the tariff form, profile editor and simulator. The bill form uses the same `Field`. The 28-test browser suite passes.
