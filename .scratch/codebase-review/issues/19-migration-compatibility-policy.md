# 19 — Write a migration compatibility policy

**What to build:** A short written rule, in `docs/DATABASE.md`, for how schema changes stay compatible with the deployment that's live while they run, plus a review checklist.

**Blocked by:** none

**Status:** ready-for-human

**Effort:** S

**Implementation:** drafted, awaiting the owner's approval

## Why

`pnpm build:vercel` migrates the database **before** the new build is live (`vercel.json`, `package.json`). While the build runs, and indefinitely if it fails, the old app runs against the new schema. The docs handle this well for the one-off 001 cutover (maintenance window). Later migrations have no general rule:

- 002 dropped a table the previous app version wrote to.
- 003 is additive, but the docs note that a stale client can drop a newly entered SNOEE value when it rewrites the whole workspace (a consequence of the whole-document sync, see ticket 28).

## Checklist

- [x] Adopt expand/contract: a migration only adds (nullable or defaulted) columns and tables. Removals ship in a later release, once no deployed build uses them.
- [x] State what a destructive migration requires (a maintenance window, as in 001).
- [x] Document how clients learn that they're outdated. Ties to ticket 28: the server could reject saves from clients with an older schema version instead of silently dropping fields.
- [ ] Add the checklist to the pull-request template, if one is added. There's no template yet (no `.github/`), so this stays open.

## Comments

I drafted the policy as "Compatibility policy" under "Migration and deployment" in `docs/DATABASE.md`. It's still `ready-for-human`, because it's a rule the owner has to agree to rather than code. It covers:

- **Expand, then contract,** including how to rename in steps.
- **When a maintenance window is required,** reusing the 001 procedure. It names 002 as a migration that should have had one.
- **Outdated clients.** Until ticket 28, a migration that adds user-editable fields has to say so, and users reload. The planned fix is a client schema version that the server checks, rejecting older saves with a "reload to continue" response. That isn't implemented; it belongs with ticket 28.
- **A six-item review checklist.**

The new migration runner (ticket 18) adds one safeguard in code: an older build refuses to migrate a database that a newer build has already migrated.

Decisions for the owner:

- Is a maintenance window acceptable for every destructive change, or should some drops wait for a contract release instead?
- Should the schema-version check on saves become its own ticket now, or wait for 28?
