# 08 — One confirmation dialog for destructive actions

**What to build:** A reusable `ConfirmDialog` component based on the tariff deletion dialog from `d18a33e`, used for every destructive action.

**Blocked by:** 07

**Status:** ready-for-agent

**Effort:** S–M

**Implementation:** complete

## Why

Deletion is confirmed three different ways:

- Deleting a comparator tariff uses a dedicated danger dialog with the focus on "Cancelar" (`dashboard.tsx:493-541`).
- Removing a history record uses a plain `Modal` with a primary green button for "Eliminar registro" (`tariff-history.tsx:286-322`).
- Deleting a bill uses the browser's native `window.confirm` (`bills.tsx:335`). That doesn't match the app's style, and some embedded browsers block it.

`TariffRecordForm` is also mounted in three places (`dashboard.tsx:560` and `:586`, `tariff-history.tsx:370`), and `BillForm` in two (`dashboard.tsx:543`, `bills.tsx:355`). With ticket 07's actions they can share one save path.

## Checklist

- [x] `ConfirmDialog` takes a title, a summary slot, a consequence text, a confirm label and `onConfirm`. It focuses "Cancelar" first and uses danger styling for the confirm button.
- [x] Use it for tariff deletion, history-record removal and bill deletion. Remove `window.confirm`.
- [x] Bill deletion shows the month, supplier and amount, and says what's preserved.
- [x] Browser tests cover confirming and cancelling each deletion with the keyboard.

## Comments

Implemented in `src/components/confirm-dialog.tsx`, based on the tariff deletion dialog from `d18a33e`. Its CSS classes were renamed from `tariff-delete-*` to `confirm-*`, and the styles are unchanged. All three deletions now share the same layout: a danger icon, a summary (a small muted line above a heading), a consequence paragraph, a muted "what's preserved" line, and "Cancelar" (focused) next to a red confirm button.

- **History records:** the summary says whether the record is the current or a previous tariff and gives its dates. The confirm button is now danger-styled instead of green.
- **Bills:** the summary shows supplier · total, and the heading is the month. The consequence says the bill leaves Mis facturas and its charts, and that tariffs, contract history and other bills are kept.
- **Shared save path:** the second paragraph of this ticket asked for one save path for `BillForm`. Ticket 07 already did that with `saveBill`, used by both the dashboard and Mis facturas. The three `TariffRecordForm` mounts already share the `tariff-periods` functions.

Tests: the tariff and history tests now cancel with Enter on the focused "Cancelar" (or Escape) and confirm with Tab then Enter. A new signed-in test covers bill deletion: the summary content, Escape, Enter on Cancelar, keyboard confirm, and that the deletion persists after a reload. Phone screenshots of all three dialogs look consistent. Typecheck, lint and the browser suite (31) pass.
