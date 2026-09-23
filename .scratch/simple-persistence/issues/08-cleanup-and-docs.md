# 08 — Remove the old persistence and rewrite the docs

**What to build:** Delete what the new design replaces, and document the new one.

**Blocked by:** 06

**Status:** completed

**Effort:** M

## Checklist

- [x] Delete `workspace-sync.ts`, the account parts of `workspace-draft.ts`, `workspace-records.ts`, `workspace-fields.ts`, `workspace-store.ts`'s whole-workspace save, `PUT /api/workspace`, and their tests (`workspace-storage.test.ts`, the sync tests).
- [x] Rewrite `docs/DATABASE.md`: the tables, RLS, how endpoints save, the Drizzle migration workflow, and the compatibility policy (expand then contract, plus bumping the schema version when a field is added).
- [x] Check `docs/SETUP.md` and the other docs for references to the old design.
- [x] Typecheck, lint, unit, integration and browser suites pass.

## Comments

Implemented (2026-09-23). The old modules and their tests were deleted as each ticket replaced them (01, 02, 06). This ticket rewrote `docs/DATABASE.md` for the new design (tables, endpoints, RLS, the Drizzle workflow, compatibility and `appSchemaVersion`, integration tests) and updated `docs/SETUP.md` and `README.md`: no "Guardar cambios", no 409, no session drafts, Drizzle and TanStack Query in the stack. Final checks: typecheck, lint, 91 unit tests, the database tests (`db`, `accounts`, `endpoints`), 41 browser tests including the signed-in ones, and `pnpm build`.
