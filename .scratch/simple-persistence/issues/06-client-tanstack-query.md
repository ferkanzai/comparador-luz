# 06 — Client on TanStack Query

**What to build:** Signed-in screens read with a query and save with a mutation per action. Guests keep the browser store.

**Blocked by:** 03, 04, 05

**Status:** completed

**Effort:** M–L

## Checklist

- [x] Add `@tanstack/react-query`. The server-rendered initial workspace seeds the query, so the first paint needs no extra request.
- [x] One hook exposes the workspace and the actions (save offer, record current, save bill, …) and hides whether it's a guest (browser storage) or an account (mutations). Components call actions, not `update(nextWorkspace)`.
- [x] Mutations update the screen immediately, roll back and show the server's message on error, and refetch the workspace when they finish. The query refetches when the window regains focus.
- [x] Profile edits are sent after a short pause, as a `PATCH` with the changed fields.
- [x] On sign-in, a guest workspace in the browser is sent to `/api/import` once, then removed from the browser.
- [x] The status shows "Guardando…", "Guardado" or the error. Remove the conflict, "invalid" and "outdated" states, and replace "outdated" with a reload message on 426.
- [x] Update the browser tests. Seed accounts through `/api/import`.

## Comments

Implemented (2026-09-23):

- `src/lib/workspace-commands.ts`: one command per user action. `apply` is the existing pure action, and `requests` lists the endpoint calls that save it. Components call `run(commands.saveBill(bill))` instead of `update(saveBill(w, bill))`.
- `src/components/use-workspace.ts`, rewritten:
  - **Guests:** state in the browser, written 250 ms after the last change and when the page is hidden.
  - **Accounts:** TanStack Query, seeded with the workspace the server read while rendering. Each command updates the cache immediately and sends its requests. Network and 5xx/429 failures are retried twice. Once no other save is pending, it refetches, so a refused or failed save goes back to the account's copy and shows the server's Spanish message (network failures get a Spanish message too). Default refetch on window focus.
  - **Profile typing:** kept in a local layer, sent after 800 ms (or on `pagehide`) as one `PATCH` with the valid fields only. An unfinished value like "1," shows "Completa el perfil para guardarlo".
  - **Sign-in:** a guest's browser copy goes to `/api/import` once, and pre-rewrite account drafts are removed.
- Statuses: `local`, `saved`, `saving`, `invalid`, `error`, `outdated` (`saveStatusLabel`). "Reintentar" reloads the account's copy. The conflict and "Cargar versión de mi cuenta" UI is gone.
- Removed `workspace-sync.ts`, account drafts, draft recovery, the session-to-local draft migration and the account-deletion draft cleanup.
- **Bug found and fixed:** Drizzle's nested relational queries pass NUMERIC through JSON numbers, so bill snapshots came back as `0.2` instead of `0.20`, and long decimals would have rounded. Bill parts are now read with plain selects, and `tests/db.test.ts` checks an exact long decimal inside a bill snapshot (it fails with the old reader).
- Known trade-off: a save the server refuses still shows the action's success message for a moment, then the refusal notice. That's the cost of updating the screen before the answer arrives.
- Tests: browser tests seed accounts through `seedWorkspace` (the same `writeChanges` the endpoints use, straight to the test database). The autosave test covers retries after a network failure, a 422 refusal, and saving after recovery. A new test covers a guest's comparison moving into the account on sign-in, and profile typing persisting.
