# 02 — Read endpoint and mutation plumbing

**What to build:** `GET /api/workspace` from the new tables, the shared code every mutation uses, and `POST /api/import`.

**Blocked by:** 01

**Status:** completed

**Effort:** M

## Checklist

- [x] `GET /api/workspace` returns the same `Workspace` shape as today (without `reviewedOn`), so the UI doesn't change.
- [x] One helper for mutations: session from the database, origin check, rate limit, schema-version header (426 for older builds), Zod body validation, then in one transaction: load the workspace, run a pure action, validate the result, and write the rows that differ between before and after.
- [x] `POST /api/import`: takes a guest workspace and merges it with `mergeGuestComparison` (no UI).
- [x] Integration tests against a disposable local `*_test` database: read, import, RLS isolation between two accounts, 426, rate limit.

## Comments

Implemented (2026-09-23):

- `src/db/workspace.ts`: `readWorkspace` (returns the domain `Workspace`, validated by `workspaceSchema`), `ensureWorkspace`, and `writeChanges(before, after)`, which upserts only new or changed records and deletes the missing ones. Columns map generically from the Drizzle tables: an empty value is NULL, and decimals are stored with a point.
- `src/lib/account-api.ts`: `mutation(bodySchema, action)` builds a save endpoint. It checks the origin, the database session, the `x-luz-schema` header (426 for older builds), the content type, the rate limit (`save_rate`) and a 4 MB body. It validates with Zod, runs the pure action on the stored workspace, and checks the result with `workspaceSchema`. A thrown Spanish message or a rule violation becomes a 422 with the message. Otherwise it writes the changes. On success it answers `{}` rather than the saved record, because the client refetches after every save anyway.
- `GET /api/workspace` answers `{ data }`, with no version. `PUT` answers 426 for tabs left open on older builds. `POST /api/import` merges a guest workspace with `mergeGuestComparison`. That carries the profile, offers and the current tariff; guests can't record bills.
- `reviewedOn` is removed from the domain. `workspace-store.ts`, `workspace-records.ts` and `workspace-fields.ts` and their tests are deleted. The home page reads through `withAccount`, and still passes `version: 0` to the client until ticket 06.
- Tests: `tests/db.test.ts` adds a round trip of a full workspace (exact decimals, negative totals, every optional bill part), an edit that writes only what changed, creation order, and the rate limit. `tests/accounts.test.ts` now covers import, 403, 426 (header and `PUT`), 400 and 401. The bill assertions come back with ticket 05.
