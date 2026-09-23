# Sync account workspaces with per-record change sets

Signed-in saves stop sending the whole workspace. Each user action becomes a change set: the records it upserts and removes, the workspace version it was based on, the client's schema version and a client-generated id. Edits made on different devices to different records merge without a prompt; only edits to the same record conflict, and only that record is offered for resolution. We accept per-row versions, tombstones and an idempotency log in exchange, because whole-workspace saves made every concurrent edit an all-or-nothing conflict whose only exit discarded local work, and their size grew with history rather than with the edit.

## Records

A change set upserts or removes whole records. The conflict units are:

- each tariff in the workspace's tariffs;
- each tariff period in the tariff history, including its tariff snapshot;
- each bill, including its tariff snapshot, comparison profile and breakdown;
- the current tariff pointer, `currentId` and `currentSince` together;
- each field of the comparison profile, except the tax assumptions (`taxes`, `vat`, `electricityTax`, `minimumTax`), which are one unit.

An action that touches several units, such as `recordCurrent`, is one change set and is applied atomically or not at all. There is no ordering operation: nothing in the product reorders records, so the server appends new rows and removals leave gaps in `position`.

## Detecting conflicts

Every row and every profile unit stores the workspace version that last wrote it, and a removal leaves a tombstone (kind, id, version). A change set conflicts when any unit it touches was written or removed after its base version. Without tombstones, editing a bill removed on another device would silently recreate it.

## Applying a queue

The client sends every queued change set in one request, in order, after the existing debounce. Inside the RLS transaction the server applies them in order and, after each one, checks workspace invariants (capacity, current tariff exists, non-overlapping tariff periods, unique ids) against the resulting state. It stops at the first change set that conflicts or breaks an invariant, and answers with an acknowledgement for each applied set plus that problem. Later change sets stay queued until the user resolves it, because they may depend on it.

The server records applied change-set ids, so retrying after a lost response returns the original acknowledgement instead of a self-conflict.

## Resolving

- **Same-record conflict:** show both versions of that record. "Keep mine" reapplies the change set on top of the account's latest version; "Keep the account's" drops it.
- **Invariant rejected after a merge:** explain the rule and the records involved. The user can discard the change or reopen its form with their values; "Keep mine" is not offered because it cannot apply.

## Versions and staleness

- Save responses and window focus report the workspace version. When it has moved, the client refetches the whole workspace and reapplies its queue on top. Pulling only changed records can come later, using the same row versions and tombstones.
- Change sets carry the client's schema version. The server refuses older versions and asks for a reload; after it, queued records are laid over the server's copy, so fields the old client didn't know keep their stored values instead of schema defaults.
- Tombstones and applied change-set ids are kept for 30 days. A change set based on an older version is answered with "base too old", and the client refetches and reapplies.

## What stays

- Guest workspaces stay local and are unaffected.
- A full replace remains only for importing a guest draft or a JSON export into an account, behind an explicit confirmation.
- "Cargar versión de mi cuenta" becomes a plain read that discards the local queue.
- Queued change sets are stored with the local draft, so they survive a reload or a short disconnection on one device. Offline editing on several devices at once is not a goal.

Revisit if full offline editing across devices becomes a goal, which would need real merges of the same record, or if the whole-workspace refetch becomes a measurable cost.
