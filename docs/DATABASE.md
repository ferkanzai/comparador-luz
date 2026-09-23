# Account database

Account data lives in PostgreSQL tables defined with Drizzle in `src/db/schema.ts`. Better Auth keeps its own tables (`user`, `session`, `account`, `verification`, `rateLimit`). Each account has one workspace ([`CONTEXT.md`](../CONTEXT.md)), stored as:

| Table            | One row per                                                                                                           |
| ---------------- | --------------------------------------------------------------------------------------------------------------------- |
| `workspace`      | account: the comparison profile, `current_tariff_id` and `current_since`                                              |
| `tariff`         | offer, including the current tariff ([ADR-0001](adr/0001-separate-candidates-contract-periods-and-bill-snapshots.md)) |
| `tariff_period`  | past contract period, with the columns of its tariff snapshot                                                         |
| `bill`           | bill: month, dates, amounts, consumption and review acknowledgement                                                   |
| `bill_tariff`    | a bill's optional tariff snapshot                                                                                     |
| `bill_profile`   | a bill's optional comparison-profile snapshot                                                                         |
| `bill_breakdown` | a bill's optional amounts for its nine charge concepts                                                                |
| `save_rate`      | account's one-minute window of save requests                                                                          |

Every key includes `user_id`, so the same UUID can exist in two accounts without sharing anything. Deleting a Better Auth user cascades through all of its rows. Records keep the order they were created in (`seq`).

The tables enforce types, presence, keys and ownership. Values (ranges, allowed options, a breakdown that adds up to the paid total) are validated by the Zod schemas in `src/lib/domain.ts` on every write. Amounts, consumption and prices are exact `NUMERIC`, exchanged as decimal strings. An empty form value is `NULL`, distinct from zero. Dates are `DATE`, exchanged as `YYYY-MM-DD`. Nested relational queries would pass `NUMERIC` through JSON numbers and round them, so `src/db/workspace.ts` reads bill parts with plain selects.

## Saving

Signed-in changes are saved one action at a time, and the last save wins ([ADR-0003](adr/0003-save-each-record-through-crud-endpoints.md)):

| Endpoint                                   | Action                                                          |
| ------------------------------------------ | --------------------------------------------------------------- |
| `GET /api/workspace`                       | Read the whole workspace                                        |
| `PATCH /api/profile`                       | Change some profile fields                                      |
| `PUT`, `DELETE /api/offers/[id]`           | Save or remove an offer (not the current tariff)                |
| `POST /api/contract/current`               | Register the current tariff, or a real price change             |
| `POST /api/contract/periods`               | Record a past period                                            |
| `PUT`, `DELETE /api/contract/periods/[id]` | Correct or remove a period, the current one included            |
| `PUT`, `DELETE /api/bills/[id]`            | Save or remove a bill, optionally with an offer from its prices |
| `POST /api/import`                         | Move a guest's workspace into the account on sign-in            |

Every save goes through `mutation()` in `src/lib/account-api.ts`. It checks the origin, the session (always from the database, so sign-out and password resets stop saves immediately), the rate limit and a 4 MB body. It then runs one of the pure actions in `workspace-actions.ts` or `tariff-periods.ts` on the stored workspace and validates the result with `workspaceSchema`. A refused action or a broken rule answers 422 with a Spanish message. Otherwise `writeChanges` writes only the records that differ, in one transaction. Removing something that no longer exists succeeds.

The client (`src/components/use-workspace.ts`) turns each user action into a command from `src/lib/workspace-commands.ts`: the same pure action, applied on screen at once, plus the requests above. It refetches the workspace after saving and when the window regains focus. Guests never call these endpoints; their workspace stays in the browser.

**Older builds.** Every save sends `x-luz-schema` with `appSchemaVersion` from `src/lib/domain.ts`. The server answers 426 to older versions, and to the whole-workspace `PUT /api/workspace` of builds from before ADR-0003, and the page asks the user to reload. **When you add a stored field, bump `appSchemaVersion`**, or a tab left open on the previous build could save records without it.

## Ownership and row-level security

`withAccount(userId, "read" | "write", run)` in `src/db/index.ts` opens a transaction, switches to the restricted `luz_workspace` role and sets `app.user_id` from the authenticated session. Both are transaction-local, so a pooled connection never keeps a user. Reads use repeatable-read, read-only transactions. Every account table enables and forces row-level security, with a policy that matches `user_id` to `app.user_id`. Missing identity means no rows. The role can only select, insert, update and delete on these tables. It has no login, ownership, superuser, `BYPASSRLS`, memberships, auth-table grants or `TRUNCATE`.

RLS protects against a query that forgets its ownership filter. It doesn't protect against a compromised server or stolen administrative credentials. Better Auth and migrations use `DATABASE_URL` directly. Keep credentials server-side.

## Migrations

`pnpm db:migrate` takes a session advisory lock, runs Better Auth's migrations, and then Drizzle's migrator on `migrations/`. Vercel runs it before every build (`pnpm build:vercel`).

- To change the schema, edit `src/db/schema.ts` and run `pnpm db:generate`. Review the generated SQL.
- For what Drizzle can't express (grants, policies, keys to Better Auth's tables, the key between `workspace` and `tariff` that references each other), use `pnpm db:generate --custom --name <name>` and write the SQL. `0002_row-security` is an example.
- `0000_drop-legacy` dropped the tables of the design before ADR-0003 without migrating their data. Nobody used the app yet.

**Compatibility.** Migrations run before the new build goes live, so the previous build runs against the new schema meanwhile. Only add things: tables, nullable or defaulted columns, indexes. Remove or rename in a later release, once no deployed build uses the old name. Anything destructive needs a maintenance window: back up or branch the Neon database, deploy, verify.

## Integration tests

These run only against disposable local databases. They refuse remote hosts and names that don't end in `_test`.

```sh
# Replaces the public schema of its database.
TEST_WORKSPACE_DATABASE_URL=postgresql://postgres:luz-local-test-only@127.0.0.1:55432/luz_workspace_test pnpm exec tsx --test tests/db.test.ts
# Needs `pnpm db:migrate` first; creates and removes its own users.
TEST_DATABASE_URL=postgresql://postgres:luz-local-test-only@127.0.0.1:55432/luz_test pnpm exec tsx --test tests/accounts.test.ts tests/endpoints.test.ts
```

- `tests/db.test.ts`: the baseline migration (legacy tables dropped, reruns), a full workspace round trip with exact decimals, writes limited to what changed, record order, RLS isolation, read-only reads, no identity leaking between transactions, cascade on account deletion, and the rate limit.
- `tests/endpoints.test.ts`: every save endpoint, and the rules they enforce (limits, overlapping periods, the current tariff).
- `tests/accounts.test.ts`: authentication, sessions, account isolation, origins, 426 for older builds, import, and account deletion.
- `pnpm test:browser` with `COMPARISON_TEST_DATABASE_URL` runs the signed-in browser tests, which seed accounts through the same `writeChanges`.
