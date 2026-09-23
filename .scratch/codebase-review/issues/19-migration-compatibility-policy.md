# 19 — Write a migration compatibility policy

**What to build:** A short written rule, in `docs/DATABASE.md`, for how schema changes stay compatible with the deployment that's live while they run, plus a review checklist.

**Blocked by:** none

**Status:** ready-for-human

**Effort:** S

## Why

`pnpm build:vercel` migrates the database **before** the new build is live (`vercel.json`, `package.json`). While the build runs, and indefinitely if it fails, the old app runs against the new schema. The docs handle this well for the one-off 001 cutover (maintenance window). Later migrations have no general rule:

- 002 dropped a table the previous app version wrote to.
- 003 is additive, but the docs note that a stale client can drop a newly entered SNOEE value when it rewrites the whole workspace (a consequence of the whole-document sync, see ticket 28).

## Checklist

- [ ] Adopt expand/contract: a migration only adds (nullable or defaulted) columns and tables. Removals ship in a later release, once no deployed build uses them.
- [ ] State what a destructive migration requires (a maintenance window, as in 001).
- [ ] Document how clients learn that they're outdated. Ties to ticket 28: the server could reject saves from clients with an older schema version instead of silently dropping fields.
- [ ] Add the checklist to the pull-request template, if one is added.
