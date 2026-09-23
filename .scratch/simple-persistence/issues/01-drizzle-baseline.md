# 01 — Drizzle schema and a fresh baseline

**What to build:** Define the app's tables in Drizzle and generate one baseline migration that replaces `migrations/001`–`004`.

**Blocked by:** none

**Status:** ready-for-agent

**Effort:** M

## Checklist

- [ ] Add `drizzle-orm` and `drizzle-kit`. Put the schema in `src/db/schema.ts`, following the spec's default schema, with shared column helpers for tariff and profile columns.
- [ ] Keep the CHECK constraints that protect data (ranges, enums, period dates, breakdown/consumption consistency) and the `user_id` foreign keys with cascade on account deletion.
- [ ] Keep the save rate-limit table.
- [ ] Row-level security for every app table with the restricted `luz_workspace` role, written as SQL in the baseline (Drizzle can't express the role grants).
- [ ] `pnpm db:migrate` runs Better Auth's migrations, then Drizzle's. Remove `workspace-migrations.ts`, the legacy import and the old SQL files.
- [ ] A transaction helper that sets the role and `app.user_id`, as `withWorkspaceTransaction` does today, for use with Drizzle.
- [ ] Wipe and recreate the production and preview databases (nobody uses the app yet).
