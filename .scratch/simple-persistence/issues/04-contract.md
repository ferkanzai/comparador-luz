# 04 — Contract endpoints

**What to build:** Endpoints for the current tariff and the tariff history, each running one existing action in a transaction.

**Blocked by:** 02

**Status:** ready-for-agent

**Effort:** M

## Checklist

- [ ] `POST /api/contract/current`: `recordCurrent` (first current tariff, or a real price change that closes the previous period).
- [ ] `POST /api/contract/periods`: `recordHistorical`.
- [ ] `PUT /api/contract/periods/:id`: `correctPeriod`, including correcting the current tariff and moving a shared boundary.
- [ ] `DELETE /api/contract/periods/:id`: `removePeriod`, including the current one.
- [ ] Overlaps, future dates and a missing period come back as 4xx with the action's Spanish message.
- [ ] Tests for each action, and for a rule violation.
