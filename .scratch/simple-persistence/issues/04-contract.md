# 04 — Contract endpoints

**What to build:** Endpoints for the current tariff and the tariff history, each running one existing action in a transaction.

**Blocked by:** 02

**Status:** completed

**Effort:** M

## Checklist

- [x] `POST /api/contract/current`: `recordCurrent` (first current tariff, or a real price change that closes the previous period).
- [x] `POST /api/contract/periods`: `recordHistorical`.
- [x] `PUT /api/contract/periods/:id`: `correctPeriod`, including correcting the current tariff and moving a shared boundary.
- [x] `DELETE /api/contract/periods/:id`: `removePeriod`, including the current one.
- [x] Overlaps, future dates and a missing period come back as 4xx with the action's Spanish message.
- [x] Tests for each action, and for a rule violation.

## Comments

Implemented (2026-09-23): `POST /api/contract/current` (`recordCurrent`), `POST /api/contract/periods` (`recordHistorical`), and `PUT`/`DELETE /api/contract/periods/[id]` (`correctPeriod`, `removePeriod`). The action generates new record ids on the server, and the client picks them up when it refetches. Removing a period that is already gone succeeds. Covered by `tests/endpoints.test.ts`: current, price change, overlap refusal, correction, idempotent removal.
