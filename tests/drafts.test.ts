import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyWorkspace, newTariff } from "../src/lib/domain";
import {
  markPendingDeletion,
  mergeGuestComparison,
  migrateDraft,
  readDraft,
  recoverDraft,
  removeDeletedAccountDrafts,
  writeDraft,
} from "../src/lib/workspace-draft";

const memory = () => {
  const entries = new Map<string, string>();
  return {
    getItem: (k: string) => entries.get(k) ?? null,
    setItem: (k: string, v: string) => {
      entries.set(k, v);
    },
    removeItem: (k: string) => {
      entries.delete(k);
    },
  };
};
test("drafts survive navigation, preserve unfinished inputs and stay scoped to their owner", () => {
  const storage = memory();
  const data = emptyWorkspace();
  data.profile.peakKwh = "1,";
  assert.equal(writeDraft(storage, "guest", { data, version: 0 }), true);
  assert.deepEqual(readDraft(storage, "guest"), { data, version: 0 });
  assert.equal(readDraft(storage, "another-user"), null);
});
test("a confirmed account deletion removes only that account's drafts from this browser", () => {
  const local = memory();
  const legacy = memory();
  const draft = { data: emptyWorkspace(), version: 0 };
  for (const owner of ["guest", "deleted-user", "other-user"])
    writeDraft(local, owner, draft);
  writeDraft(legacy, "deleted-user", draft);
  removeDeletedAccountDrafts(local, legacy);
  assert.ok(readDraft(local, "deleted-user"), "no pending deletion, no change");
  markPendingDeletion(local, "deleted-user");
  removeDeletedAccountDrafts(local, legacy);
  assert.equal(readDraft(local, "deleted-user"), null);
  assert.equal(readDraft(legacy, "deleted-user"), null);
  assert.ok(readDraft(local, "guest"));
  assert.ok(readDraft(local, "other-user"));
});
test("signing in carries guest consumption and offers without replacing the account contract or history", () => {
  const account = emptyWorkspace();
  const current = { ...newTariff(), name: "Saved contract" };
  account.tariffs = [current];
  account.currentId = current.id;
  account.currentSince = "2026-01-01";
  const guest = emptyWorkspace();
  const offer = { ...newTariff(), name: "Draft offer" };
  guest.tariffs = [offer];
  guest.currentId = offer.id;
  guest.profile.days = "29";
  const merged = mergeGuestComparison(account, guest);
  assert.equal(merged.currentId, current.id);
  assert.equal(merged.profile.days, "29");
  assert.deepEqual(merged.tariffs, [current, offer]);
  assert.deepEqual(merged.history, account.history);
  assert.deepEqual(merged.bills, account.bills);
  assert.deepEqual(mergeGuestComparison(merged, guest), merged);
  assert.equal(
    mergeGuestComparison(emptyWorkspace(), guest).currentId,
    offer.id,
  );
});
test("storage failure is reported instead of claiming a draft is saved", () => {
  const storage = {
    ...memory(),
    setItem: () => {
      throw new Error("quota");
    },
  };
  assert.equal(
    writeDraft(storage, "guest", { data: emptyWorkspace(), version: 0 }),
    false,
  );
});

test("session drafts migrate once and survive a new tab session", () => {
  const local = memory();
  const session = memory();
  const data = emptyWorkspace();
  data.profile.peakKwh = "42,";
  writeDraft(session, "guest", { data, version: 0 });
  assert.deepEqual(migrateDraft(local, session, "guest")?.data, data);
  assert.equal(readDraft(session, "guest"), null);
  assert.deepEqual(migrateDraft(local, memory(), "guest")?.data, data);
  const stale = emptyWorkspace();
  writeDraft(session, "guest", { data: stale, version: 0 });
  assert.deepEqual(migrateDraft(local, session, "guest")?.data, data);
});

test("failed migration retains the session draft", () => {
  const session = memory();
  const local = {
    ...memory(),
    setItem: () => {
      throw new Error("quota");
    },
  };
  const draft = { data: emptyWorkspace(), version: 2 };
  writeDraft(session, "alice", draft);
  assert.deepEqual(migrateDraft(local, session, "alice"), draft);
  assert.deepEqual(readDraft(session, "alice"), draft);
});

test("clean browser copies yield to the server; unsynced edits recover or conflict", () => {
  const base = emptyWorkspace();
  const next = { ...base, profile: { ...base.profile, days: "30" } };
  assert.deepEqual(
    recoverDraft({ data: next, version: 5 }, { data: base, base, version: 4 })
      .data,
    next,
  );
  const pending = recoverDraft(
    { data: base, version: 4 },
    { data: next, base, version: 4 },
  );
  assert.equal(pending.conflict, false);
  assert.deepEqual(pending.data, next);
  const conflict = recoverDraft(
    { data: base, version: 5 },
    { data: next, base, version: 4 },
  );
  assert.equal(conflict.conflict, true);
  assert.deepEqual(conflict.data, next);
});

test("navigation during a save recovers subsequent edits, including a revert", () => {
  const base = emptyWorkspace();
  const sent = { ...base, profile: { ...base.profile, days: "30" } };
  const draft = { data: base, base, pending: sent, version: 4 };
  const recovered = recoverDraft({ data: sent, version: 5 }, draft);
  assert.equal(recovered.conflict, false);
  assert.equal(recovered.version, 5);
  assert.deepEqual(recovered.data, base);
  assert.deepEqual(recovered.saved, sent);
  // If the request is still running, its snapshot must survive the reload too.
  assert.deepEqual(
    recoverDraft({ data: base, version: 4 }, draft).pending,
    sent,
  );
});

test("legacy drafts discard invoices with tramos and retain ordinary invoices", () => {
  const storage = memory();
  const bill = {
    id: crypto.randomUUID(),
    month: "2026-09",
    provider: "Supplier",
    paid: "10",
    credit: "0",
    kwh: "",
    notes: "Keep me",
    tariff: null,
  };
  storage.setItem(
    "luz:comparison-draft:v1:guest",
    JSON.stringify({
      data: {
        ...emptyWorkspace(),
        bills: [
          bill,
          { ...bill, id: crypto.randomUUID(), priceLines: [] },
          { id: "retired", priceLines: [{ amount: "invalid" }] },
        ],
      },
      version: 8,
    }),
  );
  const draft = readDraft(storage, "guest");
  assert.equal(draft?.version, 8);
  assert.equal(draft?.data.bills.length, 2);
  assert.ok(draft?.data.bills.every((b) => !("priceLines" in b)));
  assert.equal(draft?.data.bills[0].notes, "Keep me");
});
