# 18 — Replace the hand-written migration runner

**What to build:** A generic runner that applies `migrations/NNN-*.sql` in order, each once, recorded in `app_migration`, inside the existing advisory-locked transaction.

**Blocked by:** none

**Status:** ready-for-agent

**Effort:** M

**Implementation:** complete

## Why

`src/lib/workspace-migrations.ts` has one hand-written function per migration (`removeInvoicePriceLines`, `addSnoeeCost`), each repeating "check the marker, read the file, run it, insert the marker". They're called from two code paths: the upgrade path (lines 71–72) and the fresh-install path (lines 99 and 180), in a different order in each. Adding migration 004 means editing both paths correctly. It's easy to forget one, or to order them wrongly for fresh installs.

Also, Better Auth's `runMigrations()` (`scripts/migrate.ts:9`) runs outside the advisory lock and outside the transaction, so two concurrent deployments against the same database could race on the auth schema.

## Checklist

- [x] Discover migration files by name and apply them in numeric order. Skip the ones already recorded. Keep 001's special legacy-import step as a code hook attached to that migration id.
- [x] Fresh installs and upgrades use the same sequence.
- [x] Take the advisory lock before Better Auth's migrations too, or document why that's unsafe.
- [x] On a fresh database, `pnpm db:migrate` prints Better Auth's "Missing tables … Run `npx auth migrate`" warning before creating those tables itself (seen during the review). Silence it or replace it with a clear "creating auth tables" line, so deploy logs don't look like a failure.
- [x] Refuse to run if the database has a recorded migration id that the code doesn't know (a newer schema than the app).
- [x] `tests/workspace-storage.test.ts` fresh-install, legacy-import and incremental-upgrade cases still pass. Add a case for an unknown recorded migration.

## Comments

`src/lib/workspace-migrations.ts` now discovers `migrations/NNN-*.sql` and applies every file not yet recorded in `app_migration`, in numeric order. Each file is recorded by its name without `.sql`, and it all runs in the existing advisory-locked transaction. Fresh installs and upgrades run the same loop. Adding 005 now means adding one file, with no code change. `migrateWorkspaces` returns the ids it applied. Two files sharing a number fail the run.

**001's code steps** stay as hooks keyed to its id: the legacy table is renamed before the SQL, and the role, grants and RLS are set up after it.

**The legacy import moved to the end of the run.** The record writers target the latest schema: they write `snoee_kwh`, which is why the old code applied 003 in the middle of 001. Forced RLS is on by then, so the import lifts it with `NO FORCE ROW LEVEL SECURITY` while the owner writes across accounts, then forces it again. This is the same pattern 002 uses. On a legacy database, 002 now runs before the import instead of after. That makes no difference, because the import already drops invoices with price lines (`normalizeWorkspaceStorage`).

**Unknown migrations are refused.** If `app_migration` contains an id the build doesn't have, the run fails before changing anything, with "The database has migrations this build doesn't include (…)".

**Better Auth's migrations** now run under a session advisory lock (`719432, 0`), which `scripts/migrate.ts` takes on a dedicated client and holds across both the auth and workspace migrations. A session lock is needed because Better Auth uses its own connections, so it can't join our transaction. Key 0 also can't collide with the workspace transaction lock (`719432, 1`).

**The "Missing tables … Run `npx auth migrate`" message** came from Better Auth's schema check, which runs when `betterAuth()` initialises. `auth.ts` now exports `authOptions()`, and the script plans from the options without initialising Better Auth. The script prints "Creating auth tables: …" or "Adding auth columns to: …", then which workspace migrations it applied.

One Better Auth warning remains on reruns: "Field lastRequest in table rateLimit has a different type … Expected number but got int8". The old script prints it too. Better Auth's own planner creates that column as `bigint` and then flags it, so I left it rather than lower the log level and hide real warnings.

Validation:

- `tests/workspace-storage.test.ts` passes: legacy import and its validation rollback, reruns, the 002 and 003 incremental upgrades, and the fresh install. The fresh-install case now also checks two things: that every migration file is applied in order, and that a second run applies nothing.
- A new case records `999-from-the-future` and expects the run to be refused.
- I ran `pnpm db:migrate` against new scratch databases: a fresh run, a rerun, and two concurrent runs on another fresh database. The concurrent runs serialised: one created everything, and the other found nothing to do.
- Typecheck, lint and the unit tests (103) pass.
