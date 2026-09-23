# 14 — Cache sessions in a signed cookie

**What to build:** Enable Better Auth's session cookie cache, so the page load and each workspace save don't query the session table.

**Blocked by:** none

**Status:** ready-for-agent

**Effort:** S

**Implementation:** complete

## Why

`src/lib/auth.ts` doesn't set `session.cookieCache`. The home page (`page.tsx:24`), `GET /api/workspace` and every debounced `PUT /api/workspace` each call `getSession`, which reads the database. The pool has three connections (`db.ts:8`).

## Trade-off to decide

With a cookie cache, a revoked session (sign-out elsewhere, password reset) keeps working until the cache expires. Workspace writes still go through RLS with the user id from the session. **Open question: what maximum delay is acceptable?** Better Auth docs suggest around 5 minutes.

## Checklist

- [x] Set `session.cookieCache: { enabled: true, maxAge }` with the agreed value.
- [x] Decide whether sign-out and password reset must take effect immediately for workspace saves. If so, bypass the cache on `PUT`.
- [x] Account tests pass.

## Comments

Decision (user, 2026-09-23): 5-minute cookie cache for page loads and reads. `PUT /api/workspace` always checks the session in the database (Better Auth `disableCookieCache: true` on that `getSession` call), so sign-out and password reset stop writes immediately.

**What was done**

- `src/lib/auth.ts`: `session.cookieCache: { enabled: true, maxAge: 300 }`, using Better Auth's default signed "compact" strategy.
- `src/app/api/workspace/route.ts`:
  - `GET` uses the cache. `PUT` passes `disableCookieCache: true`, so every save reads the session from the database.
  - Both use `returnHeaders: true` and forward Better Auth's `Set-Cookie` headers.
    - This refreshes the cache cookie after a database read, so the cache stays warm beyond the first five minutes after sign-in. The cookie is set by `GET` on each page load.
    - It also makes the daily session extension (`updateAge`) reach the browser. Before this, the route dropped that cookie.
  - The route's shared `json` helper now takes cookies explicitly per request. The 429 response goes through it too.
- The home page (`current-user.ts`) also benefits. It runs in a server component, so it can read the cache but can't refresh it; the `GET` above does.

**Decisions**

- This also applies to the ticket 15 cleanup. Sessions removed when an account is verified can still read for up to five minutes, but can't save. Under the new sign-up rules, an attacker never gets a session, so this only affects sessions created before that change.
- `docs/SETUP.md` states the five-minute window.

**Validation**

- `tests/accounts.test.ts`:
  - After a password reset, a `GET` with the old cookies still returns 200, which shows the cache is being used. A `PUT` returns 401. A `GET` without the cache cookie returns 401.
  - Same after sign-out.
  - A `GET` without the cache cookie returns a new `session_data` cookie.
- `pnpm typecheck`, `pnpm lint`, 105 unit tests and 36 browser tests pass.
