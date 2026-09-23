# 01 — Drizzle schema and a fresh baseline

**What to build:** Define the app's tables in Drizzle and generate one baseline migration that replaces `migrations/001`–`004`.

**Blocked by:** none

**Status:** completed

**Effort:** M

## Checklist

- [x] Add `drizzle-orm` and `drizzle-kit`. Put the schema in `src/db/schema.ts`, following the spec's default schema, with shared column helpers for tariff and profile columns.
- [x] ~~Keep the CHECK constraints~~ (see comments). The `user_id` foreign keys cascade on account deletion.
- [x] Keep the save rate-limit table.
- [x] Row-level security for every app table with the restricted `luz_workspace` role, written as SQL in the baseline (Drizzle can't express the role grants).
- [x] `pnpm db:migrate` runs Better Auth's migrations, then Drizzle's. Remove `workspace-migrations.ts`, the legacy import and the old SQL files.
- [x] A transaction helper that sets the role and `app.user_id`, as `withWorkspaceTransaction` does today, for use with Drizzle.
- [ ] Wipe and recreate the production and preview databases (nobody uses the app yet).

## Comments

Implemented (2026-09-23):

- `src/db/schema.ts` defines seven account tables plus `save_rate`. Unlike the spec's default, a bill's optional parts (tariff snapshot, profile snapshot, breakdown) are small child tables. Their columns would clash with the bill's own (`provider`) and would need prefixed names everywhere. Drizzle relations read them together. A tariff period always has its snapshot, so those columns are in its row.
- **No CHECK constraints.** The tables enforce types, NOT NULL, keys and ownership. Values (ranges, enums, reconciled breakdowns) are validated only by the Zod schemas, which run on every write. Keeping both is the duplication the old field registry existed to police.
- `migrations/`: `0000_drop-legacy` drops the pre-Drizzle tables (no data kept), `0001_baseline` is generated, and `0002_row-security` adds what Drizzle can't express: foreign keys to Better Auth's `user`, the current-tariff key (the tables reference each other), the `luz_workspace` role, and forced RLS with grants.
- `src/db/index.ts`: `database()` and `withAccount(userId, "read" | "write", run)`.
- `scripts/migrate.ts` runs Better Auth, then Drizzle's migrator. `pnpm db:generate` runs `drizzle-kit generate`.
- Removed `workspace-migrations.ts` and `tests/workspace-storage.test.ts`. `tests/db.test.ts` covers dropping the legacy tables, reruns, exact decimals and dates, RLS isolation, read-only reads, no identity leaking between transactions, and cascade on account deletion.
- Still to do by hand: wipe Production and Preview, which happens automatically when the branch deploys, because `0000` drops the old tables.
