# 05 — Bill endpoints

**What to build:** `PUT`/`DELETE /api/bills/:id`.

**Blocked by:** 02

**Status:** ready-for-agent

**Effort:** S

## Checklist

- [ ] `PUT /api/bills/:id` creates or replaces a bill through `saveBill`. It optionally takes `newOffer`, so "Crear tarifa con estos precios" saves the bill and the offer in one transaction.
- [ ] `DELETE /api/bills/:id`. Deleting one that no longer exists succeeds.
- [ ] Tests: snapshots are stored and returned unchanged; the breakdown must reconcile; the optional new offer is created.
