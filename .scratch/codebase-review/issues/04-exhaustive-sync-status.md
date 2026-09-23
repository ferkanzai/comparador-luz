# 04 — Exhaustive sync status and an actionable "invalid" message

**What to build:** Replace the nested ternaries that describe sync status with `switch` statements over `SyncSnapshot["status"]` that end in a `never` check. Make the "invalid" status tell the user what to fix.

**Blocked by:** none

**Status:** ready-for-agent

**Effort:** S

## Why

- `dashboard.tsx:265-281` picks the status label with an eight-level nested ternary. `WorkspaceSync.snapshot` (`workspace-sync.ts:53-70`) derives the status with another chain. Adding a status compiles without a label. The repo rule requires exhaustive switches over unions.
- "Guardado aquí · completa los datos para sincronizar" never says which data is incomplete. It also shows when the workspace breaks a limit (for example the 101st tariff, see ticket 07), where there is nothing to "complete".
- Several labels look alike to users: "pendiente de sincronizar", "sin sincronizar", "completa los datos…".

## Checklist

- [ ] Add `syncStatusLabel(status, stored)` in a small module with a `switch` and a `never` default. Use it in the dashboard.
- [ ] Keep `stored === false` handled first, as it is now.
- [ ] For "invalid", surface the first schema issue's message (the sync layer already has access to the parse result) in the status tooltip and next to the label.
- [ ] Review the eight labels with the user's vocabulary in `CONTEXT.md`. Make "pending", "error" and "invalid" clearly different, and give the error state a retry action as today.
- [ ] Unit-test every status label.
