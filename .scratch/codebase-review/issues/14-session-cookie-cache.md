# 14 — Cache sessions in a signed cookie

**What to build:** Enable Better Auth's session cookie cache, so the page load and each workspace save don't query the session table.

**Blocked by:** none

**Status:** ready-for-agent

**Effort:** S

## Why

`src/lib/auth.ts` doesn't set `session.cookieCache`. The home page (`page.tsx:24`), `GET /api/workspace` and every debounced `PUT /api/workspace` each call `getSession`, which reads the database. The pool has three connections (`db.ts:8`).

## Trade-off to decide

With a cookie cache, a revoked session (sign-out elsewhere, password reset) keeps working until the cache expires. Workspace writes still go through RLS with the user id from the session. **Open question: what maximum delay is acceptable?** Better Auth docs suggest around 5 minutes.

## Checklist

- [ ] Set `session.cookieCache: { enabled: true, maxAge }` with the agreed value.
- [ ] Decide whether sign-out and password reset must take effect immediately for workspace saves. If so, bypass the cache on `PUT`.
- [ ] Account tests pass.

## Comments

Decision (user, 2026-09-23): 5-minute cookie cache for page loads and reads. `PUT /api/workspace` always checks the session in the database (Better Auth `disableCookieCache: true` on that `getSession` call), so sign-out and password reset stop writes immediately.
