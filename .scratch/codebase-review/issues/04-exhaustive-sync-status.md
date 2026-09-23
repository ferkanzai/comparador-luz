# 04 — Exhaustive sync status and an actionable "invalid" message

**What to build:** Replace the nested ternaries that describe sync status with `switch` statements over `SyncSnapshot["status"]` that end in a `never` check. Make the "invalid" status tell the user what to fix.

**Blocked by:** none

**Status:** ready-for-agent

**Effort:** S

**Implementation:** complete

## Why

- `dashboard.tsx:265-281` picks the status label with an eight-level nested ternary. `WorkspaceSync.snapshot` (`workspace-sync.ts:53-70`) derives the status with another chain. Adding a status compiles without a label. The repo rule requires exhaustive switches over unions.
- "Guardado aquí · completa los datos para sincronizar" never says which data is incomplete. It also shows when the workspace breaks a limit (for example the 101st tariff, see ticket 07), where there is nothing to "complete".
- Several labels look alike to users: "pendiente de sincronizar", "sin sincronizar", "completa los datos…".

## Checklist

- [x] Add `syncStatusLabel(status, stored)` in a small module with a `switch` and a `never` default. Use it in the dashboard.
- [x] Keep `stored === false` handled first, as it is now.
- [x] For "invalid", surface the first schema issue's message (the sync layer already has access to the parse result) in the status tooltip and next to the label.
- [x] Review the eight labels with the user's vocabulary in `CONTEXT.md`. Make "pending", "error" and "invalid" clearly different, and give the error state a retry action as today.
- [x] Unit-test every status label.

## Comments

Implemented in `src/lib/sync-status.ts`. `WorkspaceSync.snapshot` now uses early returns instead of the nested ternary, and carries a new `issue` field.

- Zod's default messages are in English, so the invalid state doesn't show them raw. `describeWorkspaceIssue` names the record instead: "Revisa la tarifa «Luz Fija».", "Revisa la factura de Enero 2026.", "Revisa el perfil de consumo.", or "Hay demasiadas tarifas (máximo 100). Elimina alguna para volver a sincronizar." for the 101st-tariff case. The message shows in the status tooltip and in a notice under the header.
- Labels changed: pending is "Guardado aquí · se enviará a tu cuenta" and invalid is "Guardado aquí · no se puede sincronizar". Error keeps "sin sincronizar" and its Reintentar button.
- A failed local write still takes precedence over every status except "saved", matching the previous order.

The API route still returns the raw first Zod message on a 400. The client never sends invalid data, so users don't see it.

Validation: unit tests for every label and issue type, and the 27-test browser suite against a disposable database.
