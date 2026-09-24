# 06 — Responsive dialogs and drawers, without stacking

**What to build:** Move every dialog to shadcn: `Dialog`/`AlertDialog` from `md` (768px) up, `Drawer` below it. Fix the stacked dialogs from codebase-review ticket 26 on the way.

**Blocked by:** 05

**Status:** ready-for-agent

**Effort:** M–L

## Checklist

- [ ] Add shadcn `dialog`, `alert-dialog`, `drawer`. One `ResponsiveDialog` (and `ResponsiveConfirm`) chooses by `useMediaQuery("(min-width: 768px)")` and renders the same content in either. Titles are always present (`DialogTitle`/`DrawerTitle`).
- [ ] Drawers: swipe to dismiss from the handle only (`handleOnly`); the body scrolls; X, "Cancelar" and the backdrop close. Forms open at about 90% height; confirmations at their natural height with actions at the bottom.
- [ ] Replace `Modal` (native `<dialog>`, 8 uses) and `ConfirmDialog` (4 uses). Remove `modal-scroll.ts` if the primitives handle scroll locking.
- [ ] Ticket 26, bill form: "Crear tarifa con estos precios" becomes a step inside the bill dialog/drawer, with "Volver a la factura". Returning keeps the bill's values; saving the tariff links it to the bill.
- [ ] Ticket 26, tariff details: "Registrar como actual", "Editar" and "Duplicar" open their form in place of the details, and closing the form returns to the details.
- [ ] Browser tests: keyboard focus order and focus return for both flows, Escape, the phone drawer (open, scroll a long form, close by handle and by X), and the existing dialog tests updated. Visual baselines refreshed.
- [ ] Close codebase-review ticket 26.
