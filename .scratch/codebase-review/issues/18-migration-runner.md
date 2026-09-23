# 18 — Replace the hand-written migration runner

**What to build:** A generic runner that applies `migrations/NNN-*.sql` in order, each once, recorded in `app_migration`, inside the existing advisory-locked transaction.

**Blocked by:** none

**Status:** ready-for-agent

**Effort:** M

## Why

`src/lib/workspace-migrations.ts` has one hand-written function per migration (`removeInvoicePriceLines`, `addSnoeeCost`), each repeating "check the marker, read the file, run it, insert the marker". They're called from two code paths: the upgrade path (lines 71–72) and the fresh-install path (lines 99 and 180), in a different order in each. Adding migration 004 means editing both paths correctly. It's easy to forget one, or to order them wrongly for fresh installs.

Also, Better Auth's `runMigrations()` (`scripts/migrate.ts:9`) runs outside the advisory lock and outside the transaction, so two concurrent deployments against the same database could race on the auth schema.

## Checklist

- [ ] Discover migration files by name and apply them in numeric order. Skip the ones already recorded. Keep 001's special legacy-import step as a code hook attached to that migration id.
- [ ] Fresh installs and upgrades use the same sequence.
- [ ] Take the advisory lock before Better Auth's migrations too, or document why that's unsafe.
- [ ] On a fresh database, `pnpm db:migrate` prints Better Auth's "Missing tables … Run `npx auth migrate`" warning before creating those tables itself (seen during the review). Silence it or replace it with a clear "creating auth tables" line, so deploy logs don't look like a failure.
- [ ] Refuse to run if the database has a recorded migration id that the code doesn't know (a newer schema than the app).
- [ ] `tests/workspace-storage.test.ts` fresh-install, legacy-import and incremental-upgrade cases still pass. Add a case for an unknown recorded migration.
