# 26 — Avoid stacked dialogs

**What to build:** Remove flows that open one modal dialog on top of another, or that close one dialog and immediately open another.

**Blocked by:** 07

**Status:** needs-triage

**Effort:** M

## Why

- In `BillForm`, "Crear tarifa con estos precios" opens the full `TariffForm` dialog on top of the bill dialog (`bill-form.tsx:424`). That gives two `showModal()` layers, two scroll locks and two close buttons. On a phone both fill the screen, and it's easy to lose track of which one you're in.
- The "Registrar como actual", "Editar" and "Duplicar" buttons in `TariffDetails` close the details dialog and open a form dialog (`comparison-table.tsx:385-431`). Closing the form drops the user back on the table instead of the details they came from.

## Checklist

- [ ] Bill form: create the tariff in a step inside the same dialog (with a "Volver a la factura" button), or let the bill form link an invoice-only price snapshot without creating a comparator tariff.
- [ ] Details → form: decide whether closing the form returns to the details, and make it consistent.
- [ ] Browser tests for the keyboard focus order through both flows.
