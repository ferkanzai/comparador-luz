# 21 — Cut per-keystroke work in the sync layer

**What to build:** Avoid re-validating and re-serializing the whole workspace several times for every edit.

**Blocked by:** none

**Status:** completed

**Effort:** S–M

## Why

Each `WorkspaceSync.update` (`workspace-sync.ts`) does all of the following:

- Calls `persist()`, which writes the whole workspace to `localStorage` synchronously.
- Builds `snapshot`, which runs `equal()` (two `JSON.stringify`) and `workspaceSchema.safeParse`.
- Calls `schedule()`, which runs `equal()` and `safeParse` again.

Profile fields fire this on every keystroke. Measured on a laptop: about 1 ms for a typical workspace, and about 12 ms at 100 tariffs and 600 bills, before rendering. Expect several times that on a mid-range phone.

## Checklist

- [x] Memoize validity and "equal to saved" per `data` object reference (the workspace is immutable), for example with a `WeakMap` or by storing them with `data`.
- [x] Debounce the `localStorage` write (for example 250 ms), and flush it on `pagehide` or `visibilitychange`. Keep "local durability precedes every network write": flush before `send`.
- [x] Keep `stored` accurate after a debounced write fails.
- [x] `tests/workspace-sync.test.ts` and `tests/drafts.test.ts` pass. Add a test that the draft is written before a network send.

## Comments

Implemented (2026-09-23). `workspace-sync.ts` caches each workspace's serialization and `safeParse` result in `WeakMap`s keyed by the immutable `data` object, so an edit validates and serializes the new workspace once. `update` now writes the draft on a 250 ms debounce, then notifies again with the true `stored`. Every other write is immediate: before a send, after a response, on retry, and on `dispose`. `saveDraft()` forces a pending write. `use-workspace.ts` calls it on `pagehide` and `visibilitychange`, before it removes the guest draft after a merge, and before "Cargar versión de mi cuenta" writes the account copy (so a late debounced write can't overwrite it). Ticket 28 will replace most of the whole-workspace equality checks. The debounced draft write stays.
