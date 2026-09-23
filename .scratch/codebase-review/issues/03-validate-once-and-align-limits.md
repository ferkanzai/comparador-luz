# 03 — Validate the workspace once per save and align size limits

**What to build:** Run the workspace schema once per `PUT /api/workspace`, and make the request-size limit agree with the schema's maximum counts.

**Blocked by:** none

**Status:** ready-for-agent

**Effort:** S

## Why

- Each save runs the full Zod schema three times: `src/app/api/workspace/route.ts:65`, `src/lib/workspace-store.ts:50`, and inside `normalizeWorkspaceStorage` (`src/lib/workspace-records.ts:110`). That's about 4.5 ms per parse at 600 bills.
- The limits contradict each other. The schema allows 100 tariffs, 500 history periods and 1,200 bills (`domain.ts:161-176`). A workspace with 100 tariffs and 1,200 bills serializes to about 1.2 MB, over the route's 1 MB body limit (`route.ts:53`). A user that far in would get a 413 error on every save, with no way to recover. Reaching it takes decades of monthly bills, but the rule should be consistent.

## Checklist

- [ ] The route parses once. `saveWorkspace` takes already-validated data, or does the single parse itself while the route only checks the shape. Choose one and document it on the function.
- [ ] `normalizeWorkspaceStorage` normalizes without re-parsing, or returns the parse result it already has.
- [ ] Either raise the body limit so a workspace at the schema maxima fits (with margin), or lower the schema maxima so they fit under 1 MB. Keep the draft schema in `workspace-draft.ts` consistent.
- [ ] Add a test that builds a maximum-size workspace and checks it fits the body limit.
- [ ] `tests/workspace-storage.test.ts` still passes against a disposable database.
