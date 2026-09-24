# 06 — Responsive dialogs and drawers, without stacking

**What to build:** Move every dialog to shadcn: `Dialog`/`AlertDialog` from `md` (768px) up, `Drawer` below it. Fix the stacked dialogs from codebase-review ticket 26 on the way.

**Blocked by:** 05

**Status:** completed

**Effort:** M–L

## Checklist

- [x] Add shadcn `dialog`, `alert-dialog`, `drawer`. One `ResponsiveDialog` (and `ResponsiveConfirm`) chooses by `useMediaQuery("(min-width: 768px)")` and renders the same content in either. Titles are always present (`DialogTitle`/`DrawerTitle`).
- [x] Drawers: swipe to dismiss from the handle only (`handleOnly`); the body scrolls; X, "Cancelar" and the backdrop close. Forms open at about 90% height; confirmations at their natural height with actions at the bottom.
- [x] Replace `Modal` (native `<dialog>`, 8 uses) and `ConfirmDialog` (4 uses). Remove `modal-scroll.ts` if the primitives handle scroll locking.
- [x] Ticket 26, bill form: "Crear tarifa con estos precios" becomes a step inside the bill dialog/drawer, with "Volver a la factura". Returning keeps the bill's values; saving the tariff links it to the bill.
- [x] Ticket 26, tariff details: "Registrar como actual", "Editar" and "Duplicar" open their form in place of the details, and closing the form returns to the details.
- [x] Browser tests: keyboard focus order and focus return for both flows, Escape, the phone drawer (open, scroll a long form, close by handle and by X), and the existing dialog tests updated. Visual baselines refreshed.
- [x] Close codebase-review ticket 26.

## Comments

Implemented (2026-09-24), test first: `tests/browser/dialogs.spec.ts` was written failing, then made to pass.

- `Modal` keeps its API (8 uses unchanged) and renders shadcn `Dialog` from `md` (768px, `useMediaQuery` in `src/hooks/`) and `Drawer` below it, `handleOnly`, with vaul's real `Drawer.Handle` in `drawer.tsx`. Widths: 510px, `wide` 800px, finalists nearly full width. The `modal` class stays on the content as a hook for form layouts; the legacy rules for the box, backdrop and header are gone. `modal-scroll.ts` is deleted: Radix and vaul lock scrolling.
- `ConfirmDialog` is an `AlertDialog` on desktop and the same handle-only drawer on phones, with "Cancelar" focused first. Tests now find confirmations as `alertdialog`.
- **Ticket 26, details:** the dashboard owns the open tariff's details. A form or confirmation opened from them replaces them. Cancel, X or Escape brings the details back; saving goes back to the page (the user has moved on), as does removing the tariff or recording it as current (its id changes). When the details close for good, focus returns to the button that first opened them.
- **Ticket 26, bills:** "Crear tarifa con estos precios" swaps the bill dialog's body for `TariffForm` in a new `inline` mode, titled "Añadir una tarifa", with "Volver a la factura". The bill keeps what was typed. Escape or X in the step returns to the bill, focus returns to the "Crear…" button, and saving the tariff links it to the bill.
- Two test adjustments that reflect correct behaviour: a check of the table moved after closing the details (a modal hides the page from assistive technology), and axe audits now wait for dialog animations to finish before measuring contrast.
- Checks: 45 browser tests, 91 unit tests, typecheck, lint, baselines refreshed.
