# 03 — Profile and offer endpoints

**What to build:** `PATCH /api/profile` and `PUT`/`DELETE /api/offers/:id`.

**Blocked by:** 02

**Status:** ready-for-agent

**Effort:** S

## Checklist

- [ ] `PATCH /api/profile` accepts any subset of profile fields and updates only those.
- [ ] `PUT /api/offers/:id` creates or replaces an offer through `saveTariff` (with its 100-tariff limit). The current tariff is refused here; it's corrected through the contract endpoints.
- [ ] `DELETE /api/offers/:id` removes an offer. Deleting one that no longer exists succeeds.
- [ ] Tests for each, including the limit and the refusal for the current tariff.
