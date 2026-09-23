# 08 — Remove the old persistence and rewrite the docs

**What to build:** Delete what the new design replaces, and document the new one.

**Blocked by:** 06

**Status:** ready-for-agent

**Effort:** M

## Checklist

- [ ] Delete `workspace-sync.ts`, the account parts of `workspace-draft.ts`, `workspace-records.ts`, `workspace-fields.ts`, `workspace-store.ts`'s whole-workspace save, `PUT /api/workspace`, and their tests (`workspace-storage.test.ts`, the sync tests).
- [ ] Rewrite `docs/DATABASE.md`: the tables, RLS, how endpoints save, the Drizzle migration workflow, and the compatibility policy (expand then contract, plus bumping the schema version when a field is added).
- [ ] Check `docs/SETUP.md` and the other docs for references to the old design.
- [ ] Typecheck, lint, unit, integration and browser suites pass.
