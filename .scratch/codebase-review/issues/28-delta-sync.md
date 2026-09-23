# 28 — Send only changes instead of the whole workspace on each save

**What to build:** Replace the whole-workspace `PUT /api/workspace` with saves that carry only what changed since the last acknowledged version.

**Blocked by:** 03, 07

**Status:** needs-triage

**Effort:** L

## Current design

- The client (`workspace-sync.ts`) sends the entire workspace after an 800 ms debounce, with the version it's based on.
- The server (`workspace-store.ts`, `workspace-records.ts`) claims that version, then upserts every table with `IS DISTINCT FROM` (so unchanged rows aren't rewritten) and prunes rows missing from the payload.
- Any concurrent save returns 409, and the user chooses between their local copy and the account copy (`dashboard.tsx:306-320`).

## Why change it

- **Payload and work grow with history, not with the edit.** A one-character profile change resends every tariff, history period and bill: 128 KB at 30 tariffs and 120 bills, 619 KB at 100 and 600. It's validated three times (ticket 03) and triggers 7 upserts and 6 prunes.
- **Conflicts are all-or-nothing.** Editing a bill on the phone and a tariff on the laptop conflict, even though they touch different records.
- **The only way out of a conflict discards local work.** Reproduced in the signed-in browser pass: another device saved, then deleting a tariff locally showed "Tu cuenta tiene cambios más recientes" with a single action, "Cargar versión de mi cuenta". There's no "keep my version" and no view of what differs. The user's only protection is exporting the JSON first.
- **Stale clients lose data silently.** A client that doesn't know a new field (SNOEE in 003) rewrites records without it (`docs/DATABASE.md`, "SNOEE incremental migration").

## Design sketch

1. Operations derived from ticket 07's actions, such as `{ op: "tariff.upsert", tariff }`, `{ op: "bill.remove", id }` and `{ op: "profile.set", profile }`, sent in order with the base version.
2. The server applies each operation to its own rows inside the RLS transaction. Workspace-level invariants (capacity, current tariff exists, no overlapping periods, unique ids) are validated against the resulting state, not the payload.
3. Conflict handling: operations on different records merge. Operations on the same record still conflict, and only that record is shown to the user.
4. Offline queue: the local draft stores pending operations as well as the full data, so recovery (`recoverDraft`) still works after a reload.
5. The whole-workspace `PUT` stays for guest-to-account merge and "Cargar versión de mi cuenta", or is replaced by a full-snapshot operation.

## Open questions

- Is the goal mainly performance and scale, or also fewer multi-device conflicts? Merging per record is most of the cost.
- Is offline editing across several devices a real use case, or is "one active device at a time" acceptable?

## Checklist (after the decisions)

- [ ] Write an ADR for the sync protocol (operations, conflict rules, versioning).
- [ ] Server: operation endpoint with Zod-validated operation types, handled with an exhaustive switch, plus invariant checks on the result.
- [ ] Client: `WorkspaceSync` queues operations, and draft storage keeps them.
- [ ] Tests: each operation, invariant rejection, concurrent non-overlapping edits merging, same-record conflict, lost-response recovery (the existing case in `workspace-sync.ts:139-155`), and reload with queued operations.
- [ ] Update `docs/DATABASE.md`.

## Comments

Decision (user, 2026-09-23): the goal includes merging edits from different devices, not only payload size. Operations on different records must merge without a conflict prompt; only edits to the same record conflict, and only that record is offered for resolution. Full offline editing across several devices is not a goal: queued operations only need to survive reloads and short disconnections on one device.

Left as needs-triage because it deserves a design session (grilling) and an ADR before implementation. Open design points: what "same record" means for the profile (whole profile or per field), how workspace-level invariants such as non-overlapping periods are rechecked after a merge, and whether history and bill ordering (`position`) needs its own operation.
