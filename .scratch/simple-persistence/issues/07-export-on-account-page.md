# 07 — Export on the account page

**What to build:** Signed-in users export their data from the account page instead of the home page. Guests keep "Exportar" on the home page.

**Blocked by:** 06

**Status:** completed

**Effort:** S

## Checklist

- [x] Move the export button for signed-in users to the account page, near account deletion.
- [x] Browser test for both places.

## Comments

Implemented (2026-09-23). "Descargar mis datos" was already on the account page, under "Tus datos", and works with the new `GET /api/workspace` (covered by `account-settings.spec.ts`). The home page now shows "Exportar" to guests only. The guest-import browser test checks both.
