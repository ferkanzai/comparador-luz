# 03 — Profile and offer endpoints

**What to build:** `PATCH /api/profile` and `PUT`/`DELETE /api/offers/:id`.

**Blocked by:** 02

**Status:** completed

**Effort:** S

## Checklist

- [x] `PATCH /api/profile` accepts any subset of profile fields and updates only those.
- [x] `PUT /api/offers/:id` creates or replaces an offer through `saveTariff` (with its 100-tariff limit). The current tariff is refused here; it's corrected through the contract endpoints.
- [x] `DELETE /api/offers/:id` removes an offer. Deleting one that no longer exists succeeds.
- [x] Tests for each, including the limit and the refusal for the current tariff.

## Comments

Implemented (2026-09-23): `src/app/api/profile/route.ts` (`PATCH`, any subset of profile fields) and `src/app/api/offers/[id]/route.ts` (`PUT` through `saveTariff`; `DELETE` through `removeTariff`). Both refuse the current tariff with a Spanish message. The id in the address must match the body. Copying a period into the offers is a plain `PUT` of the copy, made on the client with `comparePeriod`. Covered by `tests/endpoints.test.ts`.
