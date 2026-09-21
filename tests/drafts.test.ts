import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyWorkspace, newTariff } from "../src/lib/domain";
import {
  mergeGuestComparison,
  readDraft,
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
