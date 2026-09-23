import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyWorkspace, type Workspace } from "../src/lib/domain";
import { WorkspaceSync, SyncError } from "../src/lib/workspace-sync";
import type { WorkspaceDraft } from "../src/lib/workspace-draft";

const changed = (days: string): Workspace => ({
  ...emptyWorkspace(),
  profile: { ...emptyWorkspace().profile, days },
});
const settle = () => new Promise<void>((resolve) => setImmediate(resolve));

test("edits persist immediately, debounce, and reverting cancels the pending write", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const writes: WorkspaceDraft[] = [];
  const requests: Workspace[] = [];
  const sync = new WorkspaceSync({
    data: emptyWorkspace(),
    version: 3,
    saved: emptyWorkspace(),
    persist: (draft) => {
      writes.push(draft);
      return true;
    },
    send: async (data) => {
      requests.push(data);
      return 4;
    },
    onChange: () => {},
  });
  t.after(() => sync.dispose());
  sync.update(changed("10"));
  assert.equal(writes.at(-1)?.data.profile.days, "10");
  t.mock.timers.tick(400);
  sync.update(emptyWorkspace());
  t.mock.timers.tick(800);
  await settle();
  assert.equal(requests.length, 0);
  assert.equal(sync.snapshot.status, "saved");
  sync.update(changed("20"));
  t.mock.timers.tick(400);
  sync.update(changed("21"));
  t.mock.timers.tick(799);
  assert.equal(requests.length, 0);
  t.mock.timers.tick(1);
  await settle();
  assert.equal(requests.length, 1);
  assert.equal(requests[0].profile.days, "21");
});

test("an in-flight save never replaces newer edits, and the next save uses the new version", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let complete!: (version: number) => void;
  const requests: { data: Workspace; version: number }[] = [];
  const writes: WorkspaceDraft[] = [];
  const sync = new WorkspaceSync({
    data: emptyWorkspace(),
    version: 1,
    saved: emptyWorkspace(),
    persist: (draft) => {
      writes.push(draft);
      return true;
    },
    send: (data, version) => {
      requests.push({ data, version });
      return new Promise((resolve) => {
        complete = resolve;
      });
    },
    onChange: () => {},
  });
  t.after(() => sync.dispose());
  sync.update(changed("10"));
  t.mock.timers.tick(800);
  // Even reverting to the original state needs a second write once the first is in flight.
  sync.update(emptyWorkspace());
  t.mock.timers.tick(800);
  assert.equal(requests.length, 1);
  complete(2);
  await settle();
  assert.equal(sync.snapshot.data.profile.days, "");
  assert.equal(writes.at(-1)?.version, 2);
  assert.equal(writes.at(-1)?.data.profile.days, "");
  t.mock.timers.tick(800);
  assert.equal(requests.length, 2);
  assert.equal(requests[1].version, 2);
  complete(3);
  await settle();
  assert.equal(sync.snapshot.status, "saved");
});

test("unfinished inputs stay local, and network failures retry the latest valid changes", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let attempts = 0;
  const sync = new WorkspaceSync({
    data: emptyWorkspace(),
    version: 1,
    saved: emptyWorkspace(),
    persist: () => true,
    send: async () => {
      if (++attempts === 1) throw new Error("offline");
      return 2;
    },
    onChange: () => {},
  });
  t.after(() => sync.dispose());
  sync.update(changed("1,"));
  t.mock.timers.tick(800);
  assert.equal(attempts, 0);
  assert.equal(sync.snapshot.status, "invalid");
  sync.update(changed("12"));
  t.mock.timers.tick(800);
  await settle();
  assert.equal(sync.snapshot.status, "error");
  assert.equal(sync.snapshot.stored, true);
  t.mock.timers.tick(5000);
  await settle();
  assert.equal(attempts, 2);
  assert.equal(sync.snapshot.status, "saved");
});

test("a rate-limited save backs off and then sends the latest edits", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const requests: Workspace[] = [];
  const sync = new WorkspaceSync({
    data: emptyWorkspace(),
    version: 1,
    saved: emptyWorkspace(),
    persist: () => true,
    send: async (data) => {
      requests.push(data);
      if (requests.length === 1) throw new SyncError(429, "Demasiados");
      return 2;
    },
    onChange: () => {},
  });
  t.after(() => sync.dispose());
  sync.update(changed("10"));
  t.mock.timers.tick(800);
  await settle();
  assert.equal(sync.snapshot.status, "error");
  sync.update(changed("11"));
  t.mock.timers.tick(800);
  await settle();
  assert.equal(requests.length, 2);
  assert.equal(requests[1].profile.days, "11");
  assert.equal(sync.snapshot.status, "saved");
});

test("conflicting versions stop automatic writes while retaining edits locally", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let attempts = 0;
  const sync = new WorkspaceSync({
    data: emptyWorkspace(),
    version: 1,
    saved: emptyWorkspace(),
    persist: () => true,
    send: async () => {
      attempts++;
      throw new SyncError(409, "conflict");
    },
    onChange: () => {},
  });
  t.after(() => sync.dispose());
  sync.update(changed("10"));
  t.mock.timers.tick(800);
  await settle();
  sync.update(changed("20"));
  t.mock.timers.tick(60_000);
  await settle();
  assert.equal(attempts, 1);
  assert.equal(sync.snapshot.status, "conflict");
  assert.equal(sync.snapshot.data.profile.days, "20");
});

test("guests save locally without requests and report storage failure truthfully", () => {
  const sync = new WorkspaceSync({
    data: emptyWorkspace(),
    version: 0,
    saved: null,
    persist: () => false,
    onChange: () => {},
  });
  sync.update(changed("30"));
  assert.equal(sync.snapshot.status, "local");
  assert.equal(sync.snapshot.stored, false);
  sync.dispose();
});

test("a lost response is reconciled before saving subsequent edits", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let server = { data: emptyWorkspace(), version: 1 };
  const requests: number[] = [];
  const sync = new WorkspaceSync({
    ...server,
    saved: server.data,
    persist: () => true,
    onChange: () => {},
    readCurrent: async () => server,
    send: async (data, version) => {
      requests.push(version);
      if (version !== server.version) throw new SyncError(409, "conflict");
      server = { data, version: version + 1 };
      if (requests.length === 1) throw new Error("Response lost after commit");
      return server.version;
    },
  });
  t.after(() => sync.dispose());
  sync.update(changed("10"));
  t.mock.timers.tick(800);
  await settle();
  sync.update(changed("20"));
  t.mock.timers.tick(800);
  await settle();
  assert.equal(sync.snapshot.status, "pending");
  t.mock.timers.tick(800);
  await settle();
  assert.deepEqual(requests, [1, 1, 2]);
  assert.equal(server.data.profile.days, "20");
  assert.equal(sync.snapshot.status, "saved");
});

test("unmount cancels a queued save and preserves its local copy for recovery", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let requests = 0;
  let local: WorkspaceDraft | undefined;
  const sync = new WorkspaceSync({
    data: emptyWorkspace(),
    version: 1,
    saved: emptyWorkspace(),
    persist: (draft) => {
      local = draft;
      return true;
    },
    send: async () => {
      requests++;
      return 2;
    },
    onChange: () => {},
  });
  sync.update(changed("25"));
  sync.dispose();
  t.mock.timers.tick(800);
  await settle();
  assert.equal(requests, 0);
  assert.equal(local?.data.profile.days, "25");
});
