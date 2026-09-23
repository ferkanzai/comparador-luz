# 05 — Bill endpoints

**What to build:** `PUT`/`DELETE /api/bills/:id`.

**Blocked by:** 02

**Status:** completed

**Effort:** S

## Checklist

- [x] `PUT /api/bills/:id` creates or replaces a bill through `saveBill`. It optionally takes `newOffer`, so "Crear tarifa con estos precios" saves the bill and the offer in one transaction.
- [x] `DELETE /api/bills/:id`. Deleting one that no longer exists succeeds.
- [x] Tests: snapshots are stored and returned unchanged; the breakdown must reconcile; the optional new offer is created.

## Comments

Implemented (2026-09-23): `PUT /api/bills/[id]` with an optional `newOffer` (`saveBill`), and `DELETE`. A breakdown that doesn't reconcile is refused by the body schema (400). Covered by `tests/endpoints.test.ts`, which also brings back the bill round trip that `tests/accounts.test.ts` lost in ticket 02.
