# 21 — Cut per-keystroke work in the sync layer

**What to build:** Avoid re-validating and re-serializing the whole workspace several times for every edit.

**Blocked by:** none

**Status:** ready-for-agent

**Effort:** S–M

## Why

Each `WorkspaceSync.update` (`workspace-sync.ts`) does all of the following:

- Calls `persist()`, which writes the whole workspace to `localStorage` synchronously.
- Builds `snapshot`, which runs `equal()` (two `JSON.stringify`) and `workspaceSchema.safeParse`.
- Calls `schedule()`, which runs `equal()` and `safeParse` again.

Profile fields fire this on every keystroke. Measured on a laptop: about 1 ms for a typical workspace, and about 12 ms at 100 tariffs and 600 bills, before rendering. Expect several times that on a mid-range phone.

## Checklist

- [ ] Memoize validity and "equal to saved" per `data` object reference (the workspace is immutable), for example with a `WeakMap` or by storing them with `data`.
- [ ] Debounce the `localStorage` write (for example 250 ms), and flush it on `pagehide` or `visibilitychange`. Keep "local durability precedes every network write": flush before `send`.
- [ ] Keep `stored` accurate after a debounced write fails.
- [ ] `tests/workspace-sync.test.ts` and `tests/drafts.test.ts` pass. Add a test that the draft is written before a network send.
