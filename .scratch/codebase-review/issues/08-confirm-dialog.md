# 08 — One confirmation dialog for destructive actions

**What to build:** A reusable `ConfirmDialog` component based on the tariff deletion dialog from `d18a33e`, used for every destructive action.

**Blocked by:** 07

**Status:** ready-for-agent

**Effort:** S–M

## Why

Deletion is confirmed three different ways:

- Deleting a comparator tariff uses a dedicated danger dialog with the focus on "Cancelar" (`dashboard.tsx:493-541`).
- Removing a history record uses a plain `Modal` with a primary green button for "Eliminar registro" (`tariff-history.tsx:286-322`).
- Deleting a bill uses the browser's native `window.confirm` (`bills.tsx:335`). That doesn't match the app's style, and some embedded browsers block it.

`TariffRecordForm` is also mounted in three places (`dashboard.tsx:560` and `:586`, `tariff-history.tsx:370`), and `BillForm` in two (`dashboard.tsx:543`, `bills.tsx:355`). With ticket 07's actions they can share one save path.

## Checklist

- [ ] `ConfirmDialog` takes a title, a summary slot, a consequence text, a confirm label and `onConfirm`. It focuses "Cancelar" first and uses danger styling for the confirm button.
- [ ] Use it for tariff deletion, history-record removal and bill deletion. Remove `window.confirm`.
- [ ] Bill deletion shows the month, supplier and amount, and says what's preserved.
- [ ] Browser tests cover confirming and cancelling each deletion with the keyboard.
