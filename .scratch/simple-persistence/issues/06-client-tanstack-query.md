# 06 — Client on TanStack Query

**What to build:** Signed-in screens read with a query and save with a mutation per action. Guests keep the browser store.

**Blocked by:** 03, 04, 05

**Status:** ready-for-agent

**Effort:** M–L

## Checklist

- [ ] Add `@tanstack/react-query`. The server-rendered initial workspace seeds the query, so the first paint needs no extra request.
- [ ] One hook exposes the workspace and the actions (save offer, record current, save bill, …) and hides whether it's a guest (browser storage) or an account (mutations). Components call actions, not `update(nextWorkspace)`.
- [ ] Mutations update the screen immediately, roll back and show the server's message on error, and refetch the workspace when they finish. The query refetches when the window regains focus.
- [ ] Profile edits are sent after a short pause, as a `PATCH` with the changed fields.
- [ ] On sign-in, a guest workspace in the browser is sent to `/api/import` once, then removed from the browser.
- [ ] The status shows "Guardando…", "Guardado" or the error. Remove the conflict, "invalid" and "outdated" states, and replace "outdated" with a reload message on 426.
- [ ] Update the browser tests. Seed accounts through `/api/import`.
