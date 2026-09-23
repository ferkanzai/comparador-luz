# 03 — Validate the workspace once per save and align size limits

**What to build:** Run the workspace schema once per `PUT /api/workspace`, and make the request-size limit agree with the schema's maximum counts.

**Blocked by:** none

**Status:** ready-for-agent

**Effort:** S

**Implementation:** complete

## Why

- Each save runs the full Zod schema three times: `src/app/api/workspace/route.ts:65`, `src/lib/workspace-store.ts:50`, and inside `normalizeWorkspaceStorage` (`src/lib/workspace-records.ts:110`). That's about 4.5 ms per parse at 600 bills.
- The limits contradict each other. The schema allows 100 tariffs, 500 history periods and 1,200 bills (`domain.ts:161-176`). A workspace with 100 tariffs and 1,200 bills serializes to about 1.2 MB, over the route's 1 MB body limit (`route.ts:53`). A user that far in would get a 413 error on every save, with no way to recover. Reaching it takes decades of monthly bills, but the rule should be consistent.

## Checklist

- [x] The route parses once. `saveWorkspace` takes already-validated data, or does the single parse itself while the route only checks the shape. Choose one and document it on the function.
- [x] `normalizeWorkspaceStorage` normalizes without re-parsing, or returns the parse result it already has.
- [x] Either raise the body limit so a workspace at the schema maxima fits (with margin), or lower the schema maxima so they fit under 1 MB. Keep the draft schema in `workspace-draft.ts` consistent.
- [x] Add a test that builds a maximum-size workspace and checks it fits the body limit.
- [x] `tests/workspace-storage.test.ts` still passes against a disposable database.

## Comments

Implemented. The route is now the only validation point. `saveWorkspace` documents that it takes `workspaceSchema` output, and `normalizeWorkspaceStorage` no longer re-parses. Its rewrites (decimal comma to point, leading zeros, lowercase ids) keep values valid, and a test covers that. A full parse at the maximum counts takes about 15 ms, so each save saves about 30 ms.

The limit went from 1 MB to 4 MB (`maxWorkspaceRequestBytes` in `domain.ts`). With every list at its maximum and every field realistically filled (`tests/fixtures/max-workspace.ts`), a request is about 2.3 MB. Vercel rejects bodies over 4.5 MB, so 4 MB is the practical ceiling. A workspace with 2,000-character notes and URLs in every record still wouldn't fit, and no serverless body limit could hold it. The schema maxima and draft schema are unchanged.

Follow-up worth noting: the offline copy stores `data`, `base` and `pending` together in `localStorage`, whose quota is usually about 5 MB. A very large workspace can therefore fail to store its offline copy. `writeDraft` already returns `false` in that case.

Validation: 86 tests pass, including the accounts and workspace-storage suites against a disposable local Postgres.
