# 10 — Numeric placeholders that don't look like values

**What to build:** Change the default `0,00` placeholder on numeric fields so an empty field can't be mistaken for one containing zero.

**Blocked by:** none

**Status:** ready-for-agent

**Effort:** S

## Why

`Field` in `ui.tsx:68` defaults the placeholder to `"0,00"` for every decimal field. In the tariff form (seen on desktop and phone), required price inputs look pre-filled with zero. The instruction right above says "Usa 0 cuando un término no tenga coste". Users can reasonably think those fields already say zero, while the app treats them as unknown. `CONTEXT.md` says an unknown quantity is not zero, so the UI shouldn't blur that line.

## Checklist

- [ ] Use an example value in a lighter style (for example "p. ej. 0,1234"), or no placeholder, together with the unit suffix that's already shown.
- [ ] Keep `aria-describedby` for the unit, and keep the error messages.
- [ ] Check the tariff form, bill form, profile fields and simulator on desktop and phone.
