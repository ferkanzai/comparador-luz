# 17 — Rate-limit workspace saves

**What to build:** Limit how often one account can call `PUT /api/workspace`.

**Blocked by:** none

**Status:** ready-for-agent

**Effort:** S

## Why

Authentication endpoints are rate-limited through Better Auth, stored in the database (`auth.ts:61-74`). `/api/workspace` isn't. A signed-in user or a stolen session can send 1 MB writes continuously. Each one runs the schema three times (ticket 03) and about 13 SQL statements in one transaction, on a three-connection pool. The normal client sends at most one save every 800 ms.

## Checklist

- [ ] Choose a store that works across function instances: reuse Better Auth's rate-limit table through its API if it's exposed, or add a small counter table, or use Vercel's firewall rate limiting.
- [ ] Suggested limit: about 60 saves per minute per user. Return 429. The client already treats 429 as retryable with backoff (`workspace-sync.ts:138`).
- [ ] Test: the 61st save within a minute returns 429, and the client recovers.
