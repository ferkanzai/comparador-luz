# 02 — Read endpoint and mutation plumbing

**What to build:** `GET /api/workspace` from the new tables, the shared code every mutation uses, and `POST /api/import`.

**Blocked by:** 01

**Status:** ready-for-agent

**Effort:** M

## Checklist

- [ ] `GET /api/workspace` returns the same `Workspace` shape as today (without `reviewedOn`), so the UI doesn't change.
- [ ] One helper for mutations: session from the database, origin check, rate limit, schema-version header (426 for older builds), Zod body validation, then in one transaction: load the workspace, run a pure action, validate the result, and write the rows that differ between before and after.
- [ ] `POST /api/import`: takes a guest workspace and merges it with `mergeGuestComparison` (no UI).
- [ ] Integration tests against a disposable local `*_test` database: read, import, RLS isolation between two accounts, 426, rate limit.
