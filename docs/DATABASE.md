# Workspace database

Account data lives in relational PostgreSQL tables. `workspace` contains ownership, the current tariff reference, review dates and the optimistic-lock version. It has no JSON column.

| Table                       | Contents and relationships                                                                                |
| --------------------------- | --------------------------------------------------------------------------------------------------------- |
| `workspace_profile`         | One current consumption/tax profile per workspace                                                         |
| `workspace_tariff`          | Ordered current offers; `(user_id, id)` identifies a tariff                                               |
| `workspace_tariff_snapshot` | Independent tariff values for history entries and bills, including the original tariff ID                 |
| `workspace_history`         | Contract dates and a foreign key to a historical tariff snapshot                                          |
| `workspace_bill`            | Reporting month, invoice dates, amounts, consumption and review acknowledgement; optional tariff snapshot |
| `workspace_bill_profile`    | Optional profile snapshot belonging to one bill                                                           |
| `workspace_bill_breakdown`  | Optional typed amounts for the bill's eight charge concepts                                               |

All child keys and foreign keys include `user_id`. UUIDs can recur in another account without sharing records. Removing a live offer never changes its historical or invoice snapshots. Deleting a user cascades through their workspace and the legacy archive.

Amounts, consumption and prices use exact `NUMERIC`; missing form values use SQL `NULL`, distinct from zero. Dates use `DATE`. The existing API still returns decimal strings, with a decimal point instead of a comma and without leading integer zeroes. It preserves decimal precision, optional/null consumption distinctions, ordering, snapshot values and legacy invoice-review metadata. JSON is used for HTTP and batched SQL parameters/results, not as live database storage.

## Transactions and ownership

`workspace-store.ts` starts a transaction, switches to the restricted `luz_workspace` role and sets `app.user_id` from the authenticated server session. Both role and identity are transaction-local. Every table enables and forces row-level security with matching `USING` and `WITH CHECK` policies. Missing identity means no rows. The role has only SELECT/INSERT/UPDATE/DELETE on workspace tables, with no login, ownership, superuser, BYPASSRLS, role memberships, auth-table grants or TRUNCATE grant.

Reads use repeatable-read transactions so joins and subsequent queries see the same version. Saves claim the expected workspace version before writing, update only changed rows, prune deleted records and commit all changes atomically. Concurrent or stale saves still return HTTP 409. The API keeps its authenticated ownership checks, origin validation, body-size limits and Zod validation; database constraints additionally enforce ownership references, ranges, enums, dates and ordering.

The database identity is trusted server context, not a client-provided ID or database-verified JWT. RLS protects against omitted ownership predicates, not a compromised server or stolen administrative database credentials. Better Auth and migrations still use the configured `DATABASE_URL`; workspace operations always explicitly switch to the restricted role. Keep credentials server-side. PostgreSQL owners and BYPASSRLS/superuser roles have special privileges; see [PostgreSQL row security](https://www.postgresql.org/docs/17/ddl-rowsecurity.html).

## Migration and deployment

`pnpm db:migrate` applies Better Auth migrations and the versioned workspace migration. The database login must own the old workspace table and be able to create tables and create/grant the `luz_workspace` role. The migration fails rather than silently omitting security. An existing role with elevated attributes or memberships is rejected.

For an existing installation, this is a **maintenance-window cutover**, not a rolling migration:

1. Take a database backup/Neon branch and verify the migration on a separate database first.
2. Pause access to account persistence on the old deployment. Export unsaved browser drafts where needed.
3. Run `pnpm build:vercel`/the normal deployment while account access remains paused. It runs the migration before the build.
4. Verify saving, reloading and account isolation on the new deployment, then restore access.

Legacy invoices with nonempty `priceLines` are intentionally discarded before validation; other invoices remain. Browser drafts and incoming workspace saves apply the same rule. Migration `002-remove-invoice-price-lines` also handles databases that already ran the old relational migration: it deletes affected invoices and their dependent records and tariff snapshots, advances affected workspace versions, and drops the retired price-line table. Fresh installations do not create it.

The migration locks the legacy table, renames it to `workspace_legacy`, creates the new schema, validates each saved workspace, backfills its rows and verifies every reconstructed workspace. The initial migration retains versions and timestamps; the follow-up cleanup advances versions only for accounts with deleted invoices. Everything in the workspace migration, including the migration marker, commits in one transaction; an invalid record or failed verification rolls it all back. Concurrent workspace migrations serialize on an advisory lock. Repeat runs skip completed migrations.

`workspace_legacy` is a frozen recovery archive with forced RLS and no application policy/grants. It is never read or written by the new app and is absent on fresh installations. Administrators can inspect it with an appropriately privileged role (a non-BYPASSRLS owner must deliberately disable its RLS first). It is not a current backup after new saves occur. No automatic archive deletion is included.

**After migration commits, old application builds are incompatible.** If the subsequent app build fails, keep maintenance enabled and fix/redeploy the new build. Before accepting new writes, restoring the pre-migration database backup and old app together is a rollback option. After accepting new writes, restoring that backup would lose them; use a forward fix or a separately reviewed reverse migration. Reverting only the application is not a rollback.

## Integration checks

The existing account test uses a separate, explicitly configured local `*_test` database after `pnpm db:migrate`.

The dedicated relational test **replaces the public schema** of a disposable local database whose name ends in `_workspace_test`. It refuses remote hosts and other names:

```sh
docker exec comparador-luz-dev-postgres createdb -U postgres luz_workspace_test
TEST_WORKSPACE_DATABASE_URL=postgresql://postgres:luz-local-test-only@127.0.0.1:55432/luz_workspace_test pnpm exec tsx --test tests/workspace-storage.test.ts
```

It exercises fresh installation, legacy backfill, validation rollback, migration reruns, exact decimals, date handling, joins, snapshot preservation, all-table RLS without ownership filters, denied cross-owner inserts/updates/deletes, denied auth/archive/TRUNCATE access, missing identity, pooled identity cleanup, cross-account foreign keys, concurrent saves, consistent reads, rollback and cascade cleanup. Run it only against its own disposable database, never the account test's database.
