# 17 — Rate-limit workspace saves

**What to build:** Limit how often one account can call `PUT /api/workspace`.

**Blocked by:** none

**Status:** ready-for-agent

**Effort:** S

**Implementation:** complete

## Why

Authentication endpoints are rate-limited through Better Auth, stored in the database (`auth.ts:61-74`). `/api/workspace` isn't. A signed-in user or a stolen session can send 1 MB writes continuously. Each one runs the schema three times (ticket 03) and about 13 SQL statements in one transaction, on a three-connection pool. The normal client sends at most one save every 800 ms.

## Checklist

- [x] Choose a store that works across function instances: reuse Better Auth's rate-limit table through its API if it's exposed, or add a small counter table, or use Vercel's firewall rate limiting.
- [x] Suggested limit: about 60 saves per minute per user. Return 429. The client already treats 429 as retryable with backoff (`workspace-sync.ts:138`).
- [x] Test: the 61st save within a minute returns 429, and the client recovers.

## Comments

Implemented with a small counter table, `workspace_save_rate`, added in migration `004-workspace-save-rate.sql`. Better Auth's `rateLimit` table is keyed by IP and path rather than by account, and the `luz_workspace` role deliberately has no access to auth tables. The new table uses the same owner policy as the workspace tables, and rows cascade when the account is deleted.

`consumeSaveAllowance` upserts a one-minute fixed-window counter (limit in `workspaceSaveLimit`: 60 per 60 seconds). The route calls it after checking the session and content type but before reading the body, so a flood of saves costs one small query each and never reaches the 4 MB read or the schema parse. Over the limit it returns 429 with `Retry-After: 60`. The client retries 429 with its existing 5 to 30 second backoff and sends the latest edits once allowed.

Validation:

- The storage suite checks 60 allowed, the 61st refused, another account unaffected, each account seeing only its own counter, and the window resetting.
- A new sync unit test covers backing off after a 429 and then sending the newest edits.
- Existing databases upgraded from 003 to 004 with `pnpm db:migrate`.
- Over HTTP against the dev server, 60 saves returned 200 and the 61st returned 429.
- The 28-test browser suite still passes, so normal use stays under the limit.

Deploying needs `pnpm db:migrate`, which `build:vercel` already runs.
